export const createPreviewElement = (textContent = '=> => => =>') => {
  const previewLabel = window.document.createElement('span');
  previewLabel.className = 'bulk_preview_label';
  previewLabel.textContent = textContent;
  return previewLabel;
};
