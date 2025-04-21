import React from "react"
import { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui"
import { useAppTranslation } from "@/i18n/TranslationContext"

// Re-define SectionName type locally or import if shared
const sectionNames = [
	"providers",
	"autoApprove",
	"browser",
	"checkpoints",
	"notifications",
	"contextManagement",
	"terminal",
	"experimental",
	"language",
	"about",
] as const
type SectionName = (typeof sectionNames)[number]

interface SettingsNavProps {
	sections: { id: SectionName; icon: LucideIcon; ref?: React.RefObject<HTMLDivElement> }[] // ref is no longer needed here but kept for type consistency if imported
	activeSection: SectionName
	onSelectSection: (sectionId: SectionName) => void
}

export const SettingsNav: React.FC<SettingsNavProps> = ({ sections, activeSection, onSelectSection }) => {
	const { t } = useAppTranslation()

	return (
		<nav className="flex flex-col gap-1">
			{sections.map((section) => (
				<Button
					key={section.id}
					variant="ghost"
					className={cn(
						"w-full justify-start px-2 py-1.5 text-sm rounded-md h-auto", // Use h-auto for natural height
						activeSection === section.id
							? "bg-vscode-list-activeSelectionBackground text-vscode-list-activeSelectionForeground hover:bg-vscode-list-activeSelectionBackground" // Ensure hover doesn't change active style
							: "hover:bg-vscode-list-hoverBackground text-vscode-foreground", // Use standard foreground for inactive
					)}
					onClick={() => onSelectSection(section.id)}>
					<section.icon className="mr-2 h-4 w-4 flex-shrink-0" aria-hidden="true" />
					<span className="truncate">{t(`settings:sections.${section.id}`)}</span>
				</Button>
			))}
		</nav>
	)
}

export default SettingsNav
