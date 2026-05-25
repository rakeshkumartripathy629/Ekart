const generateSlug = (text) =>
  text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');

const generateUniqueSlug = (text) => `${generateSlug(text)}-${Math.random().toString(36).substring(2, 7)}`;

module.exports = { generateSlug, generateUniqueSlug };
