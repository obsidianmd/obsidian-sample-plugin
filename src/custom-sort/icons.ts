import {addIcon} from "obsidian";

export const ICON_SORT_ENABLED_ACTIVE: string = 'custom-sort-icon-active'
export const ICON_SORT_SUSPENDED: string = 'custom-sort-icon-suspended'
export const ICON_SORT_ENABLED_NOT_APPLIED: string = 'custom-sort-icon-enabled-not-applied'
export const ICON_SORT_SUSPENDED_SYNTAX_ERROR: string = 'custom-sort-icon-syntax-error'

export function addIcons() {
	addIcon(ICON_SORT_ENABLED_ACTIVE,
		`<path d="M 93.54751 9.983795 L 79.21469 31.556912 C 78.297815 32.93695 76.4358 33.31242 75.05576 32.395544 C 74.72319 32.174593 74.43808 31.88948 74.21713 31.556912 L 59.8843 9.983795 C 58.96743 8.603756 59.3429 6.74174 60.722935 5.824865 C 61.21491 5.4980047 61.792426 5.3236456 62.383084 5.3236456 L 91.04873 5.3236456 C 92.70559 5.3236456 94.04873 6.666791 94.04873 8.323646 C 94.04873 8.914304 93.87437 9.49182 93.54751 9.983795 Z" fill="currentColor"/>  
<path d="M 11.096126 32.678017 L 20.217128 18.949499 C 21.134003 17.56946 22.99602 17.193992 24.376058 18.110867 C 24.708624 18.331818 24.99374 18.616933 25.21469 18.949499 L 34.33569 32.678017 C 35.252567 34.058055 34.8771 35.92007 33.49706 36.836947 C 33.005085 37.163807 32.42757 37.338166 31.83691 37.338166 L 13.594907 37.338166 C 11.938053 37.338166 10.594907 35.99502 10.594907 34.338166 C 10.594907 33.747508 10.769266 33.16999 11.096126 32.678017 Z" fill="currentColor"/>  
<path d="M 11.096126 55.71973 L 20.217128 41.991214 C 21.134003 40.611175 22.99602 40.235707 24.376058 41.15258 C 24.708624 41.373533 24.99374 41.65865 25.21469 41.991214 L 34.33569 55.71973 C 35.252567 57.09977 34.8771 58.96179 33.49706 59.87866 C 33.005085 60.20552 32.42757 60.37988 31.83691 60.37988 L 13.594907 60.37988 C 11.938053 60.37988 10.594907 59.036736 10.594907 57.37988 C 10.594907 56.78922 10.769266 56.21171 11.096126 55.71973 Z" fill="currentColor"/>  
<path d="M 2.5382185 90.37054 L 20.217128 63.76105 C 21.134003 62.38101 22.99602 62.005545 24.376058 62.92242 C 24.708624 63.14337 24.99374 63.428486 25.21469 63.76105 L 42.8936 90.37054 C 43.810475 91.75058 43.435006 93.6126 42.05497 94.52947 C 41.562993 94.85633 40.985477 95.03069 40.39482 95.03069 L 5.0369993 95.03069 C 3.380145 95.03069 2.0369993 93.68755 2.0369993 92.03069 C 2.0369993 91.44004 2.2113584 90.86252 2.5382185 90.37054 Z" fill="currentColor"/>  
<path d="M 88.33569 46.24901 L 79.21469 59.97753 C 78.297815 61.35757 76.4358 61.73304 75.05576 60.81616 C 74.72319 60.59521 74.43808 60.310096 74.21713 59.97753 L 65.09613 46.24901 C 64.17925 44.868973 64.55472 43.006957 65.93476 42.09008 C 66.42673 41.76322 67.00425 41.588863 67.59491 41.588863 L 85.83691 41.588863 C 87.49377 41.588863 88.83691 42.93201 88.83691 44.58886 C 88.83691 45.17952 88.66255 45.757036 88.33569 46.24901 Z" fill="currentColor"/>  
<path d="M 88.33569 77.48964 L 79.21469 91.21816 C 78.297815 92.5982 76.4358 92.97366 75.05576 92.05679 C 74.72319 91.83584 74.43808 91.55072 74.21713 91.21816 L 65.09613 77.48964 C 64.17925 76.1096 64.55472 74.247585 65.93476 73.33071 C 66.42673 73.00385 67.00425 72.82949 67.59491 72.82949 L 85.83691 72.82949 C 87.49377 72.82949 88.83691 74.17264 88.83691 75.82949 C 88.83691 76.42015 88.66255 76.99766 88.33569 77.48964 Z"  fill="currentColor"/>`
	)
	addIcon(ICON_SORT_SUSPENDED,
		`<path d="M 93.54751 9.983795 L 79.21469 31.556912 C 78.297815 32.93695 76.4358 33.31242 75.05576 32.395544 C 74.72319 32.174593 74.43808 31.88948 74.21713 31.556912 L 59.8843 9.983795 C 58.96743 8.603756 59.3429 6.74174 60.722935 5.824865 C 61.21491 5.4980047 61.792426 5.3236456 62.383084 5.3236456 L 91.04873 5.3236456 C 92.70559 5.3236456 94.04873 6.666791 94.04873 8.323646 C 94.04873 8.914304 93.87437 9.49182 93.54751 9.983795 Z" stroke="currentColor" stroke-width="2" fill="none"/>  
<path d="M 2.5382185 90.37054 L 20.217128 63.76105 C 21.134003 62.38101 22.99602 62.005545 24.376058 62.92242 C 24.708624 63.14337 24.99374 63.428486 25.21469 63.76105 L 42.8936 90.37054 C 43.810475 91.75058 43.435006 93.6126 42.05497 94.52947 C 41.562993 94.85633 40.985477 95.03069 40.39482 95.03069 L 5.0369993 95.03069 C 3.380145 95.03069 2.0369993 93.68755 2.0369993 92.03069 C 2.0369993 91.44004 2.2113584 90.86252 2.5382185 90.37054 Z" stroke="currentColor" stroke-width="2" fill="none"/>`
	)
	addIcon(ICON_SORT_SUSPENDED_SYNTAX_ERROR,
		`<path d="M 93.54751 9.983795 L 79.21469 31.556912 C 78.297815 32.93695 76.4358 33.31242 75.05576 32.395544 C 74.72319 32.174593 74.43808 31.88948 74.21713 31.556912 L 59.8843 9.983795 C 58.96743 8.603756 59.3429 6.74174 60.722935 5.824865 C 61.21491 5.4980047 61.792426 5.3236456 62.383084 5.3236456 L 91.04873 5.3236456 C 92.70559 5.3236456 94.04873 6.666791 94.04873 8.323646 C 94.04873 8.914304 93.87437 9.49182 93.54751 9.983795 Z" fill="red"/>  
<path d="M 11.096126 32.678017 L 20.217128 18.949499 C 21.134003 17.56946 22.99602 17.193992 24.376058 18.110867 C 24.708624 18.331818 24.99374 18.616933 25.21469 18.949499 L 34.33569 32.678017 C 35.252567 34.058055 34.8771 35.92007 33.49706 36.836947 C 33.005085 37.163807 32.42757 37.338166 31.83691 37.338166 L 13.594907 37.338166 C 11.938053 37.338166 10.594907 35.99502 10.594907 34.338166 C 10.594907 33.747508 10.769266 33.16999 11.096126 32.678017 Z" stroke="red" stroke-width="2" fill="none"/>  
<path d="M 11.096126 55.71973 L 20.217128 41.991214 C 21.134003 40.611175 22.99602 40.235707 24.376058 41.15258 C 24.708624 41.373533 24.99374 41.65865 25.21469 41.991214 L 34.33569 55.71973 C 35.252567 57.09977 34.8771 58.96179 33.49706 59.87866 C 33.005085 60.20552 32.42757 60.37988 31.83691 60.37988 L 13.594907 60.37988 C 11.938053 60.37988 10.594907 59.036736 10.594907 57.37988 C 10.594907 56.78922 10.769266 56.21171 11.096126 55.71973 Z" stroke="red" stroke-width="2" fill="none"/>  
<path d="M 2.5382185 90.37054 L 20.217128 63.76105 C 21.134003 62.38101 22.99602 62.005545 24.376058 62.92242 C 24.708624 63.14337 24.99374 63.428486 25.21469 63.76105 L 42.8936 90.37054 C 43.810475 91.75058 43.435006 93.6126 42.05497 94.52947 C 41.562993 94.85633 40.985477 95.03069 40.39482 95.03069 L 5.0369993 95.03069 C 3.380145 95.03069 2.0369993 93.68755 2.0369993 92.03069 C 2.0369993 91.44004 2.2113584 90.86252 2.5382185 90.37054 Z" stroke="red" stroke-width="2" fill="none"/>  
<path d="M 88.33569 46.24901 L 79.21469 59.97753 C 78.297815 61.35757 76.4358 61.73304 75.05576 60.81616 C 74.72319 60.59521 74.43808 60.310096 74.21713 59.97753 L 65.09613 46.24901 C 64.17925 44.868973 64.55472 43.006957 65.93476 42.09008 C 66.42673 41.76322 67.00425 41.588863 67.59491 41.588863 L 85.83691 41.588863 C 87.49377 41.588863 88.83691 42.93201 88.83691 44.58886 C 88.83691 45.17952 88.66255 45.757036 88.33569 46.24901 Z" fill="red"/>  
<path d="M 88.33569 77.48964 L 79.21469 91.21816 C 78.297815 92.5982 76.4358 92.97366 75.05576 92.05679 C 74.72319 91.83584 74.43808 91.55072 74.21713 91.21816 L 65.09613 77.48964 C 64.17925 76.1096 64.55472 74.247585 65.93476 73.33071 C 66.42673 73.00385 67.00425 72.82949 67.59491 72.82949 L 85.83691 72.82949 C 87.49377 72.82949 88.83691 74.17264 88.83691 75.82949 C 88.83691 76.42015 88.66255 76.99766 88.33569 77.48964 Z" fill="red"/>`
	)
	addIcon(ICON_SORT_ENABLED_NOT_APPLIED,
		`<path d="M 93.54751 9.983795 L 79.21469 31.556912 C 78.297815 32.93695 76.4358 33.31242 75.05576 32.395544 C 74.72319 32.174593 74.43808 31.88948 74.21713 31.556912 L 59.8843 9.983795 C 58.96743 8.603756 59.3429 6.74174 60.722935 5.824865 C 61.21491 5.4980047 61.792426 5.3236456 62.383084 5.3236456 L 91.04873 5.3236456 C 92.70559 5.3236456 94.04873 6.666791 94.04873 8.323646 C 94.04873 8.914304 93.87437 9.49182 93.54751 9.983795 Z" stroke="orange" stroke-width="2" fill="none"/>  
<path d="M 11.096126 55.71973 L 20.217128 41.991214 C 21.134003 40.611175 22.99602 40.235707 24.376058 41.15258 C 24.708624 41.373533 24.99374 41.65865 25.21469 41.991214 L 34.33569 55.71973 C 35.252567 57.09977 34.8771 58.96179 33.49706 59.87866 C 33.005085 60.20552 32.42757 60.37988 31.83691 60.37988 L 13.594907 60.37988 C 11.938053 60.37988 10.594907 59.036736 10.594907 57.37988 C 10.594907 56.78922 10.769266 56.21171 11.096126 55.71973 Z" stroke="orange" stroke-width="2" fill="none"/>  
<path d="M 2.5382185 90.37054 L 20.217128 63.76105 C 21.134003 62.38101 22.99602 62.005545 24.376058 62.92242 C 24.708624 63.14337 24.99374 63.428486 25.21469 63.76105 L 42.8936 90.37054 C 43.810475 91.75058 43.435006 93.6126 42.05497 94.52947 C 41.562993 94.85633 40.985477 95.03069 40.39482 95.03069 L 5.0369993 95.03069 C 3.380145 95.03069 2.0369993 93.68755 2.0369993 92.03069 C 2.0369993 91.44004 2.2113584 90.86252 2.5382185 90.37054 Z" stroke="orange" stroke-width="2" fill="none"/>  
<path d="M 88.33569 46.24901 L 79.21469 59.97753 C 78.297815 61.35757 76.4358 61.73304 75.05576 60.81616 C 74.72319 60.59521 74.43808 60.310096 74.21713 59.97753 L 65.09613 46.24901 C 64.17925 44.868973 64.55472 43.006957 65.93476 42.09008 C 66.42673 41.76322 67.00425 41.588863 67.59491 41.588863 L 85.83691 41.588863 C 87.49377 41.588863 88.83691 42.93201 88.83691 44.58886 C 88.83691 45.17952 88.66255 45.757036 88.33569 46.24901 Z" stroke="orange" stroke-width="2" fill="none"/>`
	)
}