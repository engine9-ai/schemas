import stack from './stack.json' with { type: 'json' };

const metadata = { ...stack, exclude: [] };
const include = stack.include;
const exclude = [];

export { metadata, include, exclude };
export default { metadata };
