import React, { useEffect, useMemo } from 'react';
import OpenAI from 'openai';
import { INTELLIGENCE_VIEW_TYPE, useApp, useOpenAI, usePlugin } from '../AppView';
import { IThread } from '../types';
import DropdownSelect from './DropdownSelect';
import { MarkdownView } from 'obsidian';
import { Bot, MessageSquare, Plus, Pencil, Trash2 } from 'lucide-react';
import {
    AssistantEditModal,
    IAssistantEditModalValues,
} from './modals/AssistantEditModal';
import {} from './modals/AssistantEditModal';
import {
    ThreadEditModal,
    IThreadEditModalValues,
} from './modals/ThreadEditModal';
import { createNotice } from '@/utils/Logs';
import { defaultAssistantInstructions } from '@/utils/templates';

interface AssistantManagerProps {
    assistants: OpenAI.Beta.Assistant[];
    updateAssistants: (assistants: OpenAI.Beta.Assistant[]) => void;
    threads: IThread[];
    updateThreads: (threads: IThread[]) => void;
    activeAssistant: OpenAI.Beta.Assistant | undefined;
    updateActiveAssistant: (assistant: OpenAI.Beta.Assistant) => void;
    activeThread: IThread | undefined;
    updateActiveThread: (thread: IThread) => void;
}

const AssistantManager = ({
    assistants,
    updateAssistants,
    threads,
    updateThreads,
    activeAssistant,
    activeThread,
    updateActiveAssistant,
    updateActiveThread,
}: AssistantManagerProps) => {
    const app = useApp();
    const plugin = usePlugin();
    const openaiInstance = useOpenAI();

    useEffect(() => {
        if (!plugin || !app) {
            return;
        }

        plugin.addCommand({
            id: 'create-assistant-from-active-note',
            name: 'Create Assistant from Active Note',
            checkCallback: (checking: boolean) => {
                // Conditions to check
                const markdownView =
                    app.workspace.getActiveViewOfType(MarkdownView);
                const openFile = markdownView?.file;

                if (openFile) {
                    if (!checking) {
                        // const links = app.metadataCache.getFileCache(openFile)?.links?.map(
                        //     (link) => addFileType(truncateLink(link.link))
                        // ) || [];
                        const links = Object.keys(
                            app.metadataCache.resolvedLinks[openFile.path],
                        );

                        const backlinks = Object.keys(
                            //@ts-ignore
                            app.metadataCache.getBacklinksForFile(openFile)
                                .data,
                        ).map((file) => file);
                        const currentFile = openFile.path;
                        const filesToUpload = new Set([
                            currentFile,
                            ...links,
                            ...backlinks,
                        ]);

                        handleCreateAssistant({
                            name: `${openFile.path} Assistant`,
                            instructions: defaultAssistantInstructions,
                            files: Array.from(filesToUpload)
                                .filter((file) => file.endsWith('.md'))
                                .map((file) => ({
                                    filename: file,
                                })),
                        });
                    }
                    // This command will only show up in Command Palette when the check function returns true
                    return true;
                }
            },
        });

        plugin.addCommand({
            id: 'create-assistant-from-active-note',
            name: 'Create Thread',
            callback: async () => {
                const isViewOpen = app.workspace.getLeavesOfType(INTELLIGENCE_VIEW_TYPE).some((leaf) => {
                    return leaf.view;
                });
                if (!isViewOpen) {
                    plugin.activateView();
                }
                
                plugin.revealView();
                createThread();
            }
        });
    }, [plugin]);

    const createThread = async () => {
        if (!openaiInstance || !plugin) {
            return;
        }

        const newThreadName = 'New Thread';

        await openaiInstance.beta.threads
            .create({
                metadata: {
                    name: newThreadName,
                },
            })
            .then((res) => {
                const newThread = {
                    ...res,
                    metadata: {
                        name: newThreadName,
                    },
                };
                updateThreads([...plugin.settings.threads, newThread]);
                updateActiveThread(newThread);
            });
    };

    const editThread = async (values: IThreadEditModalValues) => {
        if (!openaiInstance || !app || !activeThread) {
            return;
        }

        const newThread = {
            ...activeThread,
            metadata: {
                name: values.metadata.name,
            },
        };

        await openaiInstance.beta.threads
            .update(activeThread.id, {
                metadata: {
                    name: values.metadata.name,
                },
            })
            .then((res) => {
                updateThreads(
                    threads.map((thread) => {
                        if (thread.id === activeThread.id) {
                            return newThread;
                        }
                        return thread;
                    }),
                );
                updateActiveThread(newThread);
            });
    };

    const handleEditThread = async () => {
        if (!openaiInstance || !app || !activeThread) {
            return;
        }

        // Get the previous values of the thread
        const previousValues = {
            metadata: {
                name: activeThread.metadata.name || '',
            },
        };

        new ThreadEditModal({
            app,
            title: 'Edit thread',
            submitButtonText: 'Edit',
            previousValues,
            onSubmit: editThread,
        }).open();
    };

    const deleteThread = async () => {
        if (!openaiInstance || !plugin || !activeThread) {
            return;
        }

        await openaiInstance.beta.threads
            .del(activeThread.id)
            .then((res) => {
                const newThreadsList = threads.filter(
                    (thread) => thread.id !== activeThread.id,
                );
                updateThreads(newThreadsList);
                updateActiveThread(newThreadsList?.[0]);
                plugin.saveSettings();
            })
            .catch((error) => {
                console.error(error);
            });
    };

    const createAssistant = async (values: IAssistantEditModalValues) => {
        if (!openaiInstance || !app) {
            return;
        }

        // use uploadFileToOpenAI to upload files to openai
        const uploadedFiles: string[] = [];
        await Promise.all(
            values.files.map(async (file) => {
                if (file.filename) {
                    const uploadedFile = await uploadFileToOpenAI(
                        file?.filename,
                    );

                    if (uploadedFile) {
                        uploadedFiles.push(uploadedFile.id);
                    }
                }
            }),
        );

        await openaiInstance.beta.assistants
            .create({
                name: values.name,
                description: values.description,
                instructions: values.instructions,
                tools: [{ type: 'code_interpreter' }, { type: 'retrieval' }],
                model: 'gpt-4-1106-preview',
                file_ids: uploadedFiles,
            })
            .then((res) => {
                createNotice(`Assistant "${values.name}" created`);
                updateAssistants([...assistants, res]);
                updateActiveAssistant(res);
            });
    };

    const handleCreateAssistant = async (
        assistant?: IAssistantEditModalValues,
    ) => {
        if (!openaiInstance || !app) {
            return;
        }

        // const assistant = await openaiInstance.beta.assistants.create({
        //     name: "Math Tutor",
        //     instructions:
        //       "You are a personal math tutor. Write and run code to answer math questions.",
        //     tools: [{ type: "code_interpreter" }],
        //     model: "gpt-4-1106-preview",
        // });
        // setActiveAssistant(assistant);
        new AssistantEditModal({
            app,
            title: 'Create new assistant',
            submitButtonText: 'Create',
            previousValues: assistant,
            onSubmit: createAssistant,
        }).open();
    };

    const editAssistant = async (values: IAssistantEditModalValues) => {
        if (!openaiInstance || !app || !activeAssistant) {
            return;
        }

        // Check each values.files element to see if there is an id. If there is, then it is already uploaded to openai and we don't need to upload it again.
        const filesToUpload: string[] = [];
        const assistantFiles: string[] = [];

        values.files.forEach((file) => {
            if (file.id) {
                assistantFiles.push(file.id);
            } else if (file.filename) {
                filesToUpload.push(file.filename);
            }
        });

        await Promise.all(
            filesToUpload.map(async (file) => {
                const uploadedFile = await uploadFileToOpenAI(file);

                if (uploadedFile) {
                    assistantFiles.push(uploadedFile.id);
                }
            }),
        );

        await openaiInstance.beta.assistants
            .update(activeAssistant.id, {
                name: values.name,
                description: values.description,
                instructions: values.instructions,
                file_ids: assistantFiles,
            })
            .then((res) => {
                updateActiveAssistant(res);
                updateAssistants(
                    assistants.map((assistant) => {
                        if (assistant.id === activeAssistant.id) {
                            return res;
                        }
                        return assistant;
                    }),
                );
            });
    };

    const handleEditAssistant = async () => {
        if (!openaiInstance || !app || !activeAssistant) {
            return;
        }

        const files = await getAssistantFiles();

        const previousValues = {
            name: activeAssistant.name || '',
            description: activeAssistant.description || '',
            instructions: activeAssistant.instructions || '',
            files: files || [],
        };

        new AssistantEditModal({
            app,
            title: 'Edit Assistant',
            submitButtonText: 'Edit',
            previousValues,
            onSubmit: editAssistant,
        }).open();
    };

    const deleteAssistant = async () => {
        if (!openaiInstance || !activeAssistant) {
            return;
        }

        await openaiInstance.beta.assistants
            .del(activeAssistant.id)
            .then((res) => {
                const newAssistantsList = assistants.filter(
                    (assistant) => assistant.id !== activeAssistant.id,
                );

                updateAssistants(newAssistantsList);
                updateActiveAssistant(newAssistantsList?.[0]);
            });
    };

    const uploadFileToOpenAI = async (
        fileName: string,
    ): Promise<OpenAI.Files.FileObject | undefined> => {
        if (!openaiInstance || !plugin || !app) {
            return undefined;
        }

        const file = await app.vault.adapter.read(fileName);
        const blob = new File([file], fileName, { type: 'text/markdown' });

        const returnedFile = await openaiInstance.files
            .create({
                purpose: 'assistants',
                file: blob,
            })
            .then((res) => {
                return res;
            })
            .catch((error) => {
                console.error(error);
                return undefined;
            });

        return returnedFile;
    };

    // const attachFileToAssistant = async (assistantId: string, fileId: string) => {
    //     //file id is file-CFBYJh1WUxRWdAtdaScVZHS7
    //     //assistant id is asst_0HHHYCL2dgImUlXbZKDRjac0
    //     if (!openaiInstance || !plugin) {
    //         return;
    //     }
    //     await openaiInstance.beta.assistants.files.create(
    //         assistantId,
    //         {
    //             file_id: fileId,
    //         }
    //     ).then((res) => {
    //         // Handle the response

    //     }).catch((error) => {
    //         // Handle the error
    //         console.error(error);
    //     });
    // };

    const getAssistantFiles = async (): Promise<
        OpenAI.Files.FileObject[] | []
    > => {
        if (!openaiInstance || !plugin || !activeAssistant) {
            return [];
        }

        try {
            const assistantFilesResponse =
                await openaiInstance.beta.assistants.files.list(
                    activeAssistant?.id,
                );

            const innerFiles: OpenAI.Files.FileObject[] = [];

            await Promise.all(
                assistantFilesResponse.data.map(async (file) => {
                    try {
                        const fileInfoResponse =
                            await openaiInstance.files.retrieve(file.id);

                        innerFiles.push(fileInfoResponse);
                    } catch (error) {
                        console.error(error);
                    }
                }),
            );

            return innerFiles;
        } catch (error) {
            console.error(error);
            return [];
        }
    };

    //format assistants into ISelectOption
    const assistantOptions = useMemo(() => {
        return assistants.map((assistant) => {
            return {
                label: assistant.name || '',
                value: assistant.id,
            };
        });
    }, [assistants]);

    const threadOptions = useMemo(() => {
        return threads.map((thread) => {
            return {
                label: thread.metadata.name,
                value: thread.id,
            };
        });
    }, [threads]);

    const onUpdateActiveAssistant = (assistantId: string) => {
        if (!openaiInstance || !activeAssistant) {
            return;
        }

        const assistant = assistants.find(
            (assistant) => assistant.id === assistantId,
        );

        updateActiveAssistant(assistant ?? assistants?.[0]);
    };

    const onUpdateActiveThread = (threadId: string) => {
        if (!openaiInstance || !activeThread) {
            return;
        }
        const newActiveThread = threads.find(
            (thread) => thread.id === threadId,
        );
        updateActiveThread(newActiveThread ?? activeThread);
    };

    return (
        <div className="chat-top-section-container">
            <div className="dropdowns-container">
                <div className="dropdown-container">
                    <Bot size={16} />
                    <DropdownSelect
                        items={assistantOptions}
                        onChange={onUpdateActiveAssistant}
                        activeItem={activeAssistant?.id || ''}
                    />
                    <div className="dropdown-buttons-container">
                        <button className="create" onClick={deleteAssistant}>
                            <Trash2 size={16} />
                        </button>
                        <button
                            className="create"
                            onClick={handleEditAssistant}
                        >
                            <Pencil size={16} />
                        </button>
                        <button
                            className="create"
                            onClick={() => handleCreateAssistant()}
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>
                <div className="dropdown-container">
                    <MessageSquare size={16} />
                    <DropdownSelect
                        items={threadOptions}
                        onChange={onUpdateActiveThread}
                        activeItem={activeThread?.id || ''}
                    />
                    <div className="dropdown-buttons-container">
                        <button className="create" onClick={deleteThread}>
                            <Trash2 size={16} />
                        </button>
                        <button className="create" onClick={handleEditThread}>
                            <Pencil size={16} />
                        </button>
                        <button className="create" onClick={createThread}>
                            <Plus size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssistantManager;
