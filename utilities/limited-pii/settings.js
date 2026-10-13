export const settings = [
  {
    name: 'exclude_pii',
    type: 'boolean',
    default: false,
    description:
      'When true, installDefaultPlugins prefers @engine9/schemas/stacks/limited-pii over default_stack, and installs of stacks/standard, person_name, person_email, person_phone, person_address, and transaction/contact_details are refused. Does not drop existing plaintext tables. Also omits the plaintext person tables from the default export list when tables is not set.'
  }
];
export default {
  settings
};
