import { App, ButtonComponent, Modal, Notice, Setting } from 'obsidian';
import OpenAI from 'openai';
import { FileSuggest } from '../suggesters/FileSuggester';
import * as yup from 'yup';
import { defaultAssistantInstructions } from '../../../utils/templates'

interface AssistantEditModalProps {
    app: App,
    title: string,
    submitButtonText?: string,
    previousValues?: IAssistantEditModalValues,
    onSubmit: (values: IAssistantEditModalValues) => void,
}

export interface IAssistantEditModalValues {
    name: string;
    description?: string;
    instructions: string;
    files: Partial<OpenAI.Files.FileObject>[];
    [key: string]: unknown;
}

export class AssistantEditModal extends Modal {
    private values: IAssistantEditModalValues = {
        name: '',
        description: '',
        instructions: defaultAssistantInstructions,
        files: [],
    };
    private title: string;
    private submitButtonText: string;
    private onSubmit: (values: IAssistantEditModalValues) => void;
    private fileListDiv: HTMLElement;
    private fileCountText: HTMLElement;

    constructor(props: AssistantEditModalProps) {
        super(props.app);
        this.title = props.title;
        this.submitButtonText = props.submitButtonText || 'Submit';
        if (props.previousValues) {
            this.values = props.previousValues;
        }
        this.onSubmit = props.onSubmit;
        this.display();
    }

    display() {
        const { contentEl } = this;

        contentEl.createEl('h1', { text: this.title });

        this.addNameSetting(contentEl);
        this.addDescriptionSetting(contentEl);
        this.addInstructionsSetting(contentEl);
        this.addFileIdsSetting(contentEl);
        this.addSubmitButton(contentEl);
    }

    addNameSetting(contentEl: HTMLElement) {
        new Setting(contentEl)
            .setName('Name (required)')
            .setDesc('The name of the assistant')
            .addText(text => {
                text.setPlaceholder('Enter name...')
                    .onChange((value) => {
                        this.values.name = value;
                    })
                    .setValue(this.values.name);
            });
    }

    addDescriptionSetting(contentEl: HTMLElement) {
        new Setting(contentEl)
            .setName('Description')
            .setDesc('The description of the assistant')
            .setClass('form-setting-textarea')
            .addTextArea(text => {
                text.setPlaceholder('Enter description...')
                    .onChange((value) => {
                        this.values.description = value;
                    })
                    .setValue(this.values.description || '');
            });
    }

    addInstructionsSetting(contentEl: HTMLElement) {
        new Setting(contentEl)
            .setName('Instructions (required)')
            .setDesc('The instructions you want the assistant to follow')
            .setClass('form-setting-textarea')
            .addTextArea(text => {
                text.setPlaceholder('Enter instructions...')
                    .onChange((value) => {
                        this.values.instructions = value;
                    })
                    .setValue(this.values.instructions);
            });
    }

    addFileIdsSetting(contentEl: HTMLElement) {
        // Function to add a file to the list

        const addFileToList = (fileName: string) => {


            // if filename already is in values, replace it. this prevents duplicates and allows for re-uploading
            const fileIndex: number = this.values.files && this.values.files.findIndex(file => file.filename === fileName);
            if (fileIndex !== -1) {
                this.values.files[fileIndex] = {
                    filename: fileName,
                };
                return;
            }

            this.values.files.push({
                filename: fileName,
            });
            updateFileCountText();
            createFileListElement(fileName);
        };

        const updateFileCountText = () => {
            this.fileCountText.setText(`Files Uploaded (${this.values.files.length}/20)`);
        }

        const createFileListElement = (fileName: string) => {
            const fileDiv = this.fileListDiv.createDiv({ cls: 'file-item' });
            fileDiv.createEl('span', { text: fileName });
            

            new ButtonComponent(fileDiv)
                .setIcon('trash-2')
                .setClass('remove-button')
                .onClick(() => {
                    fileDiv.remove();
                    // Remove the file from the values object
                    const file = this.values.files.find(file => file.filename === fileName);
                    if (file) {
                        this.values.files.remove(file);
                        updateFileCountText();
                    }
                });
        };

        new Setting(contentEl)
            .setName(`Files`)
            .setDesc('The files uploaded to the assistant (not real-time synced, so you will need to re-upload). Max 20.')
            .addSearch(search => {
                search.setPlaceholder('Enter file IDs separated by commas...')
                // .onChange((value) => {
                
                //     this.values.file_ids.push(value);
                // });

                new FileSuggest(this.app, search.inputEl, addFileToList);
            });

        // Add a div to hold the list of selected files
        this.fileCountText = contentEl.createEl('h6');
        updateFileCountText();
        this.fileListDiv = contentEl.createDiv({ cls: 'file-list' });


        // Add the files that were already selected
        this.values.files.forEach(file => {
            
            if (file.filename) {
                createFileListElement(file.filename);
            }
        });
    }

    addSubmitButton(contentEl: HTMLElement) {

        const validationSchema = yup.object().shape({
            name: yup.string().required('Name is required'),
            instructions: yup.string().required('Instructions are required'),
            files: yup.array().max(20, 'Files cannot exceed 20'),
        });

        const checkRequiredFields = async (): Promise<string[]> => {
            try {
                await validationSchema.validate(this.values, { abortEarly: false });
                return [];
            } catch (error) {
                if (error instanceof yup.ValidationError) {
                    return error.inner.map((err) => err.message) as string[];
                }
                throw error;
            }
        };

        const handleSubmit = async () => {
            const missingFields = await checkRequiredFields();
            
            if (missingFields.length > 0) {
                new Notice(`Submit Error: \n${missingFields.join('\n')}`);
                return;
            }
            this.onSubmit(this.values);

            this.onClose();
            this.close();
        }
        const modalFooterEl = contentEl.createDiv({ cls: 'modal-footer' });
        new ButtonComponent(modalFooterEl)
            .setButtonText(this.submitButtonText)
            .setClass('form-submit-button')
            .onClick(() => {
                handleSubmit();
            });
    }

    onClose() {
    }
}
