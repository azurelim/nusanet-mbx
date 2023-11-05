import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Phonebook } from '../entities/phonebook.entity';

export class PhonebookRepository extends Repository<Phonebook> {
  constructor(
    @InjectRepository(Phonebook)
    private phonebookRepository: Repository<Phonebook>,
  ) {
    super(
      phonebookRepository.target,
      phonebookRepository.manager,
      phonebookRepository.queryRunner,
    );
  }

  async getInternetSubscription(phone: string) {
    const sql = `
      SELECT cs.CustServId, cs.installation_address,
             IFNULL(cs.ServiceType, s.ServiceType) description,
             IFNULL(c.DisplayBranchId, c.BranchId) branchId
      FROM sms_phonebook pb
      LEFT JOIN CustomerServices cs ON cs.CustId = pb.custId
      LEFT JOIN Services s ON cs.ServiceId = s.ServiceId
      LEFT JOIN ServiceGroup sg ON sg.ServiceGroup = s.ServiceGroup
      LEFT JOIN Customer c ON cs.CustId = c.CustId
      WHERE phone LIKE '%${phone}'
      AND NOT(cs.CustStatus IN ('NA'))
      AND ServiceGroupTypeId = 1
    `;
    return this.query(sql);
  }

  async getDomainSubscription(phone: string) {
    const sql = `
      SELECT cs.CustServId, cs.CustDomain domain_name,
        IFNULL(cs.ServiceType, s.ServiceType) description,
        IFNULL(c.DisplayBranchId, c.BranchId) branchId
      FROM sms_phonebook pb
      LEFT JOIN CustomerServices cs ON cs.CustId = pb.custId
      LEFT JOIN Services s ON cs.ServiceId = s.ServiceId
      LEFT JOIN Customer c ON cs.CustId = c.CustId
      WHERE phone LIKE '%${phone}'
      AND cs.CustStatus != 'NA'
      AND s.ServiceGroup = 'DO'
    `;
    return this.query(sql);
  }

  async getBlockedSubscription(phone: string) {
    const sql = `
      SELECT cs.CustServId, cs.installation_address,
             IFNULL(cs.ServiceType, s.ServiceType) description,
             IFNULL(c.DisplayBranchId, c.BranchId) branchId
      FROM sms_phonebook pb
      LEFT JOIN CustomerServices cs ON cs.CustId = pb.custId
      LEFT JOIN Services s ON cs.ServiceId = s.ServiceId
      LEFT JOIN ServiceGroup sg ON sg.ServiceGroup = s.ServiceGroup
      LEFT JOIN Customer c ON cs.CustId = c.CustId
      WHERE phone LIKE '%${phone}'
      AND cs.CustStatus IN ('BL')
      AND ServiceGroupTypeId = 1
    `;
    return this.query(sql);
  }

  async getUnpaidInvoice(phone: string) {
    const sql = `
      SELECT nci.CustId, nci.Type, nci.Description,
             cit.CustTotSubsFee -
               IFNULL(cid.Amount, 0) +
               IF(cit.PPN > 100,
                  cit.PPN,
                  cit.PPN /
                    100 * (cit.CustTotSubsFee - IFNULL(cid.Amount, 0)))
               AS TotalAmount
      FROM NewCustomerInvoice nci
      LEFT JOIN NewCustomerInvoiceBatch ncib ON ncib.AI = nci.AI
      LEFT JOIN Customer c ON c.CustId = nci.CustId
      LEFT JOIN CustomerInvoiceTemp cit
        ON cit.InvoiceNum = nci.Id
          AND cit.Urut = nci.No
          AND nci.Type = 'internet'
      LEFT JOIN CustomerInvoiceDiscount cid
        ON cid.InvoiceNum = cit.InvoiceNum
          AND cid.Urut = cit.Urut
      LEFT JOIN sms_phonebook sp ON nci.CustId = sp.custId
      WHERE nci.Type IN ('internet', 'stock')
        AND ncib.batchNo IS NULL
        AND nci.Credit > 0
        AND sp.phone LIKE '%${phone}'
    `;
    return this.query(sql);
  }
}
