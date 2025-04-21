import { HTMLAttributes } from "react"

import { cn } from "@/lib/utils"

type SectionHeaderProps = HTMLAttributes<HTMLDivElement> & {
	children: React.ReactNode
	description?: string
}

export const SectionHeader = ({ description, children, className, ...props }: SectionHeaderProps) => {
	return (
		<div
			className={cn(
				"sticky top-0 z-10 text-vscode-sideBar-foreground bg-vscode-sideBar-background brightness-90 mb-6",
				className,
			)}
			{...props}>
			<h3 className="m-0 text-lg font-medium">{children}</h3>
			{description && <p className="text-vscode-descriptionForeground text-sm mt-2 mb-0">{description}</p>}
		</div>
	)
}
