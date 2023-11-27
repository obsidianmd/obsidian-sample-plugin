import OpenAI from 'openai';
import React, { useEffect, useState, useCallback } from 'react';
import Chatbox from './components/Chatbox';
import { useOpenAI, usePlugin } from './AppView';
import MessageInput from './components/MessageInput';
// import FilesUploadUI from './components/FilesUploadUI';
import AssistantManager from './components/AssistantManager';
import { IThread, ThreadAnnotationFile } from './types';
import { createNotice } from '@/utils/Logs';

const listQueryOptions: OpenAI.Beta.Threads.MessageListParams = {
    order: 'asc',
};

const PluginView = () => {
    const plugin = usePlugin();
    const openaiInstance = useOpenAI();
    const [messages, setMessages] = useState<
        OpenAI.Beta.Threads.ThreadMessage[]
    >([]);
    // const [files, setFiles] = useState<string[]>([]);
    const [assistants, setAssistants] = useState<OpenAI.Beta.Assistant[]>([]);
    const [threads, setThreads] = useState<IThread[]>([]);
    const [activeAssistant, setActiveAssistant] = useState<
        OpenAI.Beta.Assistant | undefined
    >(undefined);
    const [activeThread, setActiveThread] = useState<IThread | undefined>(
        undefined,
    );
    const [activeAssistantFiles, setActiveAssistantFiles] = useState<
        OpenAI.Files.FileObject[] | undefined
    >(undefined);
    const [isResponding, setIsResponding] = useState(false);

    useEffect(() => {
        fetchThreads();
        if (assistants.length < 1) {
            fetchAssistants();
            fetchActiveConfiguration();
        }
    }, [plugin]);

    useEffect(() => {
        if (!activeAssistant) {
            updateActiveAssistant(assistants?.[0]);
        }
    }, [assistants]);

    useEffect(() => {
        if (!activeThread) {
            updateActiveThread(threads?.[0]);
        }
    }, [threads]);

    const fetchAssistants = async () => {
        if (!openaiInstance) {
            return;
        }
        await openaiInstance.beta.assistants.list().then((res) => {
            // sort by name
            const sortedAssistants = res.data.sort((a, b) => {
                if (a.name && b.name && a.name < b.name) {
                    return -1;
                }
                return 1;
            });

            setAssistants(sortedAssistants);
        });
    };

    const fetchThreads = () => {
        if (plugin) {
            setThreads(plugin.settings.threads);
        }
    };

    const fetchActiveConfiguration = () => {
        if (plugin) {
            const savedActiveAssistant = plugin.settings.activeAssistant;
            if (savedActiveAssistant) {
                updateActiveAssistant(savedActiveAssistant);
            }
            const savedActiveThread = plugin.settings.activeThread;
            if (savedActiveThread) {
                setActiveThread(savedActiveThread);
            }
        }
    };

    const updateActiveAssistant = async (assistant: OpenAI.Beta.Assistant) => {
        if (plugin) {
            plugin.settings.activeAssistant = assistant;
            const assistantFiles = await fetchAssistantFiles();
            updateActiveAssistantFiles(assistantFiles);
            plugin.saveSettings();
            setActiveAssistant(assistant);
        }
    };

    const updateActiveAssistantFiles = (files: OpenAI.Files.FileObject[]) => {
        if (plugin) {
            plugin.settings.activeAssistantFiles = files;
            plugin.saveSettings();
            setActiveAssistantFiles(files);
        }
    };

    const updateThreads = (threads: IThread[]) => {
        if (plugin) {
            plugin.settings.threads = threads;
            plugin.saveSettings();
            setThreads(threads);
        }
    };

    const fetchAssistantFiles = async (): Promise<
        OpenAI.Files.FileObject[] | []
    > => {
        if (!openaiInstance || !plugin || !activeAssistant) {
            return [];
        }

        try {
            const assistantFilesResponse =
                await openaiInstance.beta.assistants.files.list(
                    activeAssistant.id,
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

    const updateActiveThread = (thread: IThread) => {
        if (plugin) {
            plugin.settings.activeThread = thread;

            plugin.saveSettings();
            setActiveThread(thread);
        }
    };

    const fetchMessages = async () => {
        if (!openaiInstance || !activeThread) {
            return;
        }
        try {
            const messages = await openaiInstance.beta.threads.messages.list(
                activeThread.id,
                listQueryOptions,
            );
            setMessages(messages.data);
        } catch (e) {
            createNotice(
                'Thread expired or not found. Please select a new thread.',
            );
            //remove thread from list
            const newThreads = threads.filter((t) => t.id !== activeThread.id);
            setThreads(newThreads);
            //update active thread
            setActiveThread(newThreads?.[0]);
            //save settings
            if (plugin) {
                plugin.settings.threads = newThreads;
                plugin.settings.activeThread = newThreads?.[0];
                plugin.saveSettings();
            }
        }
    };

    useEffect(() => {
        fetchMessages();
    }, [activeThread]);

    const addAnnotatedFilesToThread = async (
        messages: OpenAI.Beta.Threads.ThreadMessage[],
    ) => {
        const files: ThreadAnnotationFile[] = [];
        //for each message in messages, if it has content.type = text, then access content.annotations.file_citation.file_id and get the file name from the active files list
        messages.forEach((message) => {
            if (message.content) {
                message.content.forEach((content) => {
                    if (content.type === 'text') {
                        content.text.annotations.forEach((annotation) => {
                            // @ts-ignore
                            if (annotation.file_citation) {
                                const fileId: string =
                                    // @ts-ignore
                                    annotation.file_citation.file_id;
                                const file = activeAssistantFiles?.find(
                                    (file) => file.id === fileId,
                                );
                                if (file) {
                                    files.push({
                                        fileId: fileId,
                                        fileName: file.filename,
                                    });
                                }
                            }
                        });
                    }
                });
            }
        });

        if (files.length > 0 && activeThread) {
            const newThread: IThread = {
                ...activeThread,
                metadata: {
                    ...activeThread.metadata,
                    annotationFiles: files,
                },
            };
            const newThreads = threads.map((t) =>
                t.id === activeThread.id ? newThread : t,
            );
            updateThreads(newThreads);
            updateActiveThread(newThread);
        }
    };

    const onMessageSend = useCallback(
        async (message: string) => {
            if (openaiInstance && activeThread && activeAssistant) {
                const messageObject =
                    await openaiInstance.beta.threads.messages.create(
                        activeThread.id,
                        {
                            role: 'user',
                            content: message,
                        },
                    );

                setMessages([...messages, messageObject]);

                const run = await openaiInstance.beta.threads.runs.create(
                    activeThread.id,
                    {
                        assistant_id: activeAssistant.id,
                    },
                );

                let runStatus = await openaiInstance.beta.threads.runs.retrieve(
                    activeThread.id,
                    run.id,
                );

                // Initialize a counter and max attempts for the polling logic, and how long to wait each try
                let attempts = 0;
                const maxAttempts = 30;
                const timoutWaitTimeMs = 2000;
                setIsResponding(true);
                const terminatedRunStatuses: string[] = [
                    'cancelling',
                    'cancelled',
                    'failed',
                    'completed',
                    'expired',
                ];

                while (
                    !terminatedRunStatuses.includes(runStatus.status) &&
                    attempts < maxAttempts
                ) {
                    await new Promise((resolve) =>
                        setTimeout(resolve, timoutWaitTimeMs),
                    );
                    runStatus = await openaiInstance.beta.threads.runs.retrieve(
                        activeThread.id,
                        run.id,
                    );
                    attempts++;
                }

                // Get latest messages
                await openaiInstance.beta.threads.messages
                    .list(activeThread.id, listQueryOptions)
                    .then((res) => {
                        setMessages(res.data);
                        addAnnotatedFilesToThread(res.data);
                        setIsResponding(false);
                    });
            }
        },
        [openaiInstance, activeThread, activeAssistant, messages],
    );

    return (
        <div className="agent-view-container">
            <AssistantManager
                assistants={assistants}
                updateAssistants={setAssistants}
                activeAssistant={activeAssistant}
                updateActiveAssistant={updateActiveAssistant}
                threads={threads}
                updateThreads={updateThreads}
                activeThread={activeThread}
                updateActiveThread={updateActiveThread}
            />
            <Chatbox
                messages={messages}
                isResponding={isResponding}
                annotationFiles={activeThread?.metadata?.annotationFiles}
            />
            <MessageInput onMessageSend={onMessageSend} />
            {/* <FilesUploadUI files={files} onAddFile={onAddFile} onRemoveFile={onRemoveFile} /> */}
        </div>
    );
};

export default PluginView;
