import { App, ButtonComponent, Modal, Notice, Setting } from 'obsidian';
import * as yup from 'yup';

interface ThreadEditModalProps {
    app: App,
    title: string,
    submitButtonText?: string,
    previousValues?: IThreadEditModalValues,
    onSubmit: (values: IThreadEditModalValues) => void,
}

export interface IThreadEditModalValues {
    metadata: {
        name: string;
        [key: string]: unknown;
    },
    [key: string]: unknown;
}

export class ThreadEditModal extends Modal {
    private values: IThreadEditModalValues = {
        metadata: {
            name: '',
        },
    };
    private title: string;
    private submitButtonText: string;
    private onSubmit: (values: IThreadEditModalValues) => void;

    constructor(props: ThreadEditModalProps) {
        super(props.app);
        this.title = props.title;
        this.submitButtonText = props.submitButtonText || 'Submit';
        if (props.previousValues) {
            this.values = props.previousValues;
        }
        this.onSubmit = props.onSubmit;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h1', { text: this.title });

        // Create name input
        new Setting(contentEl)
            .setName('Name')
            .setDesc('The name of the thread')
            .addText(text => {
                text.setPlaceholder('Enter thread name...')
                    .onChange((value) => {
                        this.values.metadata.name = value;
                    })
                    .setValue(this.values.metadata.name);
            });


        const validationSchema = yup.object().shape({
            metadata: yup.object().shape({
                name: yup.string().required('Name is required'),
            }),
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
        };
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
