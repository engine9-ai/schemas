export const settings = [
  {
    name: 'exclude_pii',
    type: 'boolean',
    default: false,
    description:
      'When true, this account is PII-free for installs, imports, exports, and reports: installs of person_name, person_email, person_phone, person_address, and transaction/contact_details, and of any plugin that includes one (such as editions/contact), are refused; leftover plaintext plugin rows are skipped in the inbound weave; plaintext person tables are omitted from the default export list when tables is not set. Does not drop existing plaintext tables.'
  }
];
export default {
  settings
};
