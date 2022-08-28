export const createPreviewElement = (textContent = '=> => => =>') => {
  const previewLabel = window.document.createElement('span');
  previewLabel.className = 'previewLabel';
  previewLabel.textContent = textContent;
  previewLabel.style.margin = '0 20px';
  return previewLabel;
};
