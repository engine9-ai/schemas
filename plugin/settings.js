export const settings = [
  {
    name: 'table_prefix_counter',
    type: 'int',
    default: 2729,
    hidden: true,
    description: 'Hex table-prefix allocator. Incremented by PluginWorker.getNextTablePrefixCounter.'
  },
  {
    name: 'default_stack',
    type: 'string',
    default: '',
    description:
      'Stack (or plugin) path for installDefaultPlugins when no path is passed — e.g. @engine9/schemas/stacks/standard or @engine9/schemas/stacks/limited-pii. Empty installs the core person schema plugins only. Ignored when @engine9/schemas/utilities/limited-pii has exclude_pii true (forced limited-pii stack).'
  }
];
export default {
  settings
};
