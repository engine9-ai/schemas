export const tables = [
  /*
    person_login: who can sign in, and as which person (the /etc/passwd of an
    engine9 database). One row is one login: a Delegate account (`delegate`,
    keyed by its Domain UNID) or a verified email address (`email`, keyed by
    email_hash_v1). Only sign-in, an admin's grant, and the admin `signin`
    commands write it; the people pipeline (dedupe) never does. It holds
    hashes and Delegate pseudonyms, no contact details, so a PII-free account
    can install it. @engine9/core reads it (auth/logins.js). A database
    without it has no sign-in.
  */
  {
    name: 'person_login',
    columns: {
      type: {
        type: 'enum',
        nullable: false,
        default_value: 'email',
        values: ['email', 'delegate']
      },
      value_hash: {
        type: 'hash',
        description: 'SHA-256 hex of the trimmed, lowercased value. For email, exactly email_hash_v1'
      },
      subject: {
        type: 'string',
        nullable: true,
        description:
          'Domain UNID: the login itself on a delegate row; on an email row, the Delegate account that first signed in with the address'
      },
      person_id: 'person_id',
      how: {
        type: 'enum',
        nullable: false,
        default_value: 'created',
        values: ['created', 'adopted', 'granted', 'backfill'],
        description: 'How the row was made; an adopted login carries only self-join roles'
      },
      state: {
        type: 'enum',
        nullable: false,
        default_value: 'active',
        values: ['active', 'locked', 'retired'],
        description: 'Only an active login signs in or carries roles'
      },
      last_sign_in_at: { type: 'datetime', nullable: true },
      created_at: 'created_at',
      modified_at: 'modified_at'
    },
    indexes: [{ columns: ['type', 'value_hash'], primary: true }, { columns: 'person_id' }]
  }
];
export default {
  tables
};
