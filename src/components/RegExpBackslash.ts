export const createBackslash = (textContent = '/') => {
  const previewLabel = window.document.createElement('div');
  previewLabel.className = 'bulk_regexp_slash';
  previewLabel.textContent = textContent;
  return previewLabel;
};
