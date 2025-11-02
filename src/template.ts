import { ArticleScraperSettings } from "./settings";
import { ArticleMetadata } from "./types";

export class TemplateGenerator {
	constructor(private settings: ArticleScraperSettings) {}

	generate(metadata: ArticleMetadata): string {
		const today = this.formatDate(new Date());
		
		return `---
Published: "${metadata.published}"
Title: ${this.escapeYaml(metadata.title)}
Author: ${this.escapeYaml(metadata.author)}
Rating:
Category:
  - ${this.settings.defaultCategory}
Topics: 
Read_Status: ${this.settings.defaultReadStatus}
Overview: ${this.escapeYaml(metadata.description)}
Source: ${this.escapeYaml(metadata.siteName)}
Date_Started: "${today}"
Date_Finished:
URL: ${metadata.url}
tags: 
Note_Status: ${this.settings.defaultNoteStatus}
Word_Count: ${metadata.wordCount}
---
#### Tags: 

## Overview

${metadata.description}

## Quotes
`;
	}

	private escapeYaml(value: string): string {
		if (!value) return "";
		
		// If contains special characters, wrap in quotes
		if (/[:\-\[\]{}#&*!|>'"%@`]/.test(value) || value.includes('\n')) {
			return `"${value.replace(/"/g, '\\"')}"`;
		}
		return value;
	}

	private formatDate(date: Date): string {
		// Format as YYYY-MM-DD
		return date.toISOString().split('T')[0];
	}
}
