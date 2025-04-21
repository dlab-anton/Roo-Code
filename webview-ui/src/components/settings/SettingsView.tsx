import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import {
	CheckCheck,
	SquareMousePointer,
	Webhook,
	GitBranch,
	Bell,
	Database,
	SquareTerminal,
	FlaskConical,
	AlertTriangle,
	Globe,
	Info,
	LucideIcon,
	ChevronsUpDown,
	Check,
} from "lucide-react"

import { ExperimentId } from "@roo/shared/experiments"
import { TelemetrySetting } from "@roo/shared/TelemetrySetting"
import { ApiConfiguration } from "@roo/shared/api"

import { vscode } from "@/utils/vscode"
import { cn } from "@/lib/utils" // Added cn import
import { ExtensionStateContextType, useExtensionState } from "@/context/ExtensionStateContext"
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogCancel,
	AlertDialogAction,
	AlertDialogHeader,
	AlertDialogFooter,
	Button,
	Popover,
	PopoverContent,
	PopoverTrigger,
	Command,
	CommandInput,
	CommandList,
	CommandGroup,
	CommandItem,
} from "@/components/ui"

// Tab related imports removed
import { SetCachedStateField, SetExperimentEnabled } from "./types"
import { SectionHeader } from "./SectionHeader"
import ApiOptions from "./ApiOptions"
import { AutoApproveSettings } from "./AutoApproveSettings"
import { BrowserSettings } from "./BrowserSettings"
import { CheckpointSettings } from "./CheckpointSettings"
import { NotificationSettings } from "./NotificationSettings"
import { ContextManagementSettings } from "./ContextManagementSettings"
import { TerminalSettings } from "./TerminalSettings"
import { ExperimentalSettings } from "./ExperimentalSettings"
import { LanguageSettings } from "./LanguageSettings"
import { About } from "./About"
import SettingsNav from "./SettingsNav"

export interface SettingsViewRef {
	checkUnsaveChanges: (then: () => void) => void
}

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

// Define the structure for sections used in navigation
const sections: { id: SectionName; icon: LucideIcon }[] = [
	{ id: "providers", icon: Webhook },
	{ id: "autoApprove", icon: CheckCheck },
	{ id: "browser", icon: SquareMousePointer },
	{ id: "checkpoints", icon: GitBranch },
	{ id: "notifications", icon: Bell },
	{ id: "contextManagement", icon: Database },
	{ id: "terminal", icon: SquareTerminal },
	{ id: "experimental", icon: FlaskConical },
	{ id: "language", icon: Globe },
	{ id: "about", icon: Info },
]

// Map section names to their components
const sectionComponentMap: Record<SectionName, React.ComponentType<any>> = {
	providers: ApiOptions, // Note: ApiConfigManager is rendered within ApiOptions section
	autoApprove: AutoApproveSettings,
	browser: BrowserSettings,
	checkpoints: CheckpointSettings,
	notifications: NotificationSettings,
	contextManagement: ContextManagementSettings,
	terminal: TerminalSettings,
	experimental: ExperimentalSettings,
	language: LanguageSettings,
	about: About,
}

type SettingsViewProps = {
	onClose: () => void
	targetSection?: string // Keep targetSection prop for potential initial active tab
}

const SettingsView = forwardRef<SettingsViewRef, SettingsViewProps>(({ onClose, targetSection }, ref) => {
	const { t } = useAppTranslation()

	const extensionState = useExtensionState()
	const { currentApiConfigName, listApiConfigMeta = [], uriScheme, version, settingsImportedAt } = extensionState

	const [isDiscardDialogShow, setDiscardDialogShow] = useState(false)
	const [isChangeDetected, setChangeDetected] = useState(false)
	const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)

	// State for the active navigation tab
	const [activeSection, setActiveSection] = useState<SectionName>(
		targetSection && sectionNames.includes(targetSection as SectionName)
			? (targetSection as SectionName)
			: sectionNames[0],
	)

	const prevApiConfigName = React.useRef(currentApiConfigName)
	const confirmDialogHandler = React.useRef<() => void>()

	const [cachedState, setCachedState] = useState(extensionState)

	// Destructure all potentially needed state variables for section components
	const {
		alwaysAllowReadOnly,
		alwaysAllowReadOnlyOutsideWorkspace,
		allowedCommands,
		language,
		alwaysAllowBrowser,
		alwaysAllowExecute,
		alwaysAllowMcp,
		alwaysAllowModeSwitch,
		alwaysAllowSubtasks,
		alwaysAllowWrite,
		alwaysAllowWriteOutsideWorkspace,
		alwaysApproveResubmit,
		browserToolEnabled,
		browserViewportSize,
		enableCheckpoints,
		diffEnabled,
		experiments,
		fuzzyMatchThreshold,
		maxOpenTabsContext,
		maxWorkspaceFiles,
		mcpEnabled,
		requestDelaySeconds,
		remoteBrowserHost,
		screenshotQuality,
		soundEnabled,
		ttsEnabled,
		ttsSpeed,
		soundVolume,
		telemetrySetting,
		terminalOutputLineLimit,
		terminalShellIntegrationTimeout,
		terminalCommandDelay,
		terminalPowershellCounter,
		terminalZshClearEolMark,
		terminalZshOhMy,
		terminalZshP10k,
		terminalZdotdir,
		writeDelayMs,
		showRooIgnoredFiles,
		remoteBrowserEnabled,
		maxReadFileLine,
	} = cachedState

	// Make sure apiConfiguration is initialized and managed by SettingsView.
	const apiConfiguration = useMemo(() => cachedState.apiConfiguration ?? {}, [cachedState.apiConfiguration])

	// --- State update logic (unchanged) ---
	useEffect(() => {
		if (prevApiConfigName.current === currentApiConfigName) return
		setCachedState((prevCachedState) => ({ ...prevCachedState, ...extensionState }))
		prevApiConfigName.current = currentApiConfigName
		setChangeDetected(false)
	}, [currentApiConfigName, extensionState])

	useEffect(() => {
		if (settingsImportedAt) {
			setCachedState((prevCachedState) => ({ ...prevCachedState, ...extensionState }))
			setChangeDetected(false)
		}
	}, [settingsImportedAt, extensionState])

	const setCachedStateField: SetCachedStateField<keyof ExtensionStateContextType> = useCallback((field, value) => {
		setCachedState((prevState) => {
			if (prevState[field] === value) return prevState
			setChangeDetected(true)
			return { ...prevState, [field]: value }
		})
	}, [])

	const setApiConfigurationField = useCallback(
		<K extends keyof ApiConfiguration>(field: K, value: ApiConfiguration[K]) => {
			setCachedState((prevState) => {
				if (prevState.apiConfiguration?.[field] === value) return prevState
				setChangeDetected(true)
				return { ...prevState, apiConfiguration: { ...prevState.apiConfiguration, [field]: value } }
			})
		},
		[],
	)

	const setExperimentEnabled: SetExperimentEnabled = useCallback((id: ExperimentId, enabled: boolean) => {
		setCachedState((prevState) => {
			if (prevState.experiments?.[id] === enabled) return prevState
			setChangeDetected(true)
			return { ...prevState, experiments: { ...prevState.experiments, [id]: enabled } }
		})
	}, [])

	const setTelemetrySetting = useCallback((setting: TelemetrySetting) => {
		setCachedState((prevState) => {
			if (prevState.telemetrySetting === setting) return prevState
			setChangeDetected(true)
			return { ...prevState, telemetrySetting: setting }
		})
	}, [])

	const isSettingValid = !errorMessage

	// --- Submit logic (unchanged) ---
	const handleSubmit = () => {
		if (isSettingValid) {
			// Post all messages... (code omitted for brevity, same as original)
			vscode.postMessage({ type: "language", text: language })
			vscode.postMessage({ type: "alwaysAllowReadOnly", bool: alwaysAllowReadOnly })
			vscode.postMessage({
				type: "alwaysAllowReadOnlyOutsideWorkspace",
				bool: alwaysAllowReadOnlyOutsideWorkspace,
			})
			vscode.postMessage({ type: "alwaysAllowWrite", bool: alwaysAllowWrite })
			vscode.postMessage({ type: "alwaysAllowWriteOutsideWorkspace", bool: alwaysAllowWriteOutsideWorkspace })
			vscode.postMessage({ type: "alwaysAllowExecute", bool: alwaysAllowExecute })
			vscode.postMessage({ type: "alwaysAllowBrowser", bool: alwaysAllowBrowser })
			vscode.postMessage({ type: "alwaysAllowMcp", bool: alwaysAllowMcp })
			vscode.postMessage({ type: "allowedCommands", commands: allowedCommands ?? [] })
			vscode.postMessage({ type: "browserToolEnabled", bool: browserToolEnabled })
			vscode.postMessage({ type: "soundEnabled", bool: soundEnabled })
			vscode.postMessage({ type: "ttsEnabled", bool: ttsEnabled })
			vscode.postMessage({ type: "ttsSpeed", value: ttsSpeed })
			vscode.postMessage({ type: "soundVolume", value: soundVolume })
			vscode.postMessage({ type: "diffEnabled", bool: diffEnabled })
			vscode.postMessage({ type: "enableCheckpoints", bool: enableCheckpoints })
			vscode.postMessage({ type: "browserViewportSize", text: browserViewportSize })
			vscode.postMessage({ type: "remoteBrowserHost", text: remoteBrowserHost })
			vscode.postMessage({ type: "remoteBrowserEnabled", bool: remoteBrowserEnabled })
			vscode.postMessage({ type: "fuzzyMatchThreshold", value: fuzzyMatchThreshold ?? 1.0 })
			vscode.postMessage({ type: "writeDelayMs", value: writeDelayMs })
			vscode.postMessage({ type: "screenshotQuality", value: screenshotQuality ?? 75 })
			vscode.postMessage({ type: "terminalOutputLineLimit", value: terminalOutputLineLimit ?? 500 })
			vscode.postMessage({ type: "terminalShellIntegrationTimeout", value: terminalShellIntegrationTimeout })
			vscode.postMessage({ type: "terminalCommandDelay", value: terminalCommandDelay })
			vscode.postMessage({ type: "terminalPowershellCounter", bool: terminalPowershellCounter })
			vscode.postMessage({ type: "terminalZshClearEolMark", bool: terminalZshClearEolMark })
			vscode.postMessage({ type: "terminalZshOhMy", bool: terminalZshOhMy })
			vscode.postMessage({ type: "terminalZshP10k", bool: terminalZshP10k })
			vscode.postMessage({ type: "terminalZdotdir", bool: terminalZdotdir })
			vscode.postMessage({ type: "mcpEnabled", bool: mcpEnabled })
			vscode.postMessage({ type: "alwaysApproveResubmit", bool: alwaysApproveResubmit })
			vscode.postMessage({ type: "requestDelaySeconds", value: requestDelaySeconds })
			vscode.postMessage({ type: "maxOpenTabsContext", value: maxOpenTabsContext })
			vscode.postMessage({ type: "maxWorkspaceFiles", value: maxWorkspaceFiles ?? 200 })
			vscode.postMessage({ type: "showRooIgnoredFiles", bool: showRooIgnoredFiles })
			vscode.postMessage({ type: "maxReadFileLine", value: maxReadFileLine ?? 500 })
			vscode.postMessage({ type: "currentApiConfigName", text: currentApiConfigName })
			vscode.postMessage({ type: "updateExperimental", values: experiments })
			vscode.postMessage({ type: "alwaysAllowModeSwitch", bool: alwaysAllowModeSwitch })
			vscode.postMessage({ type: "alwaysAllowSubtasks", bool: alwaysAllowSubtasks })
			vscode.postMessage({ type: "upsertApiConfiguration", text: currentApiConfigName, apiConfiguration })
			vscode.postMessage({ type: "telemetrySetting", text: telemetrySetting })

			setChangeDetected(false)
		}
	}

	// --- Unsaved changes logic (unchanged) ---
	const checkUnsaveChanges = useCallback(
		(then: () => void) => {
			if (isChangeDetected) {
				confirmDialogHandler.current = then
				setDiscardDialogShow(true)
			} else {
				then()
			}
		},
		[isChangeDetected],
	)

	useImperativeHandle(ref, () => ({ checkUnsaveChanges }), [checkUnsaveChanges])

	const onConfirmDialogResult = useCallback((confirm: boolean) => {
		if (confirm) {
			confirmDialogHandler.current?.()
		}
	}, [])

	// Helper functions for Configuration Profile
	const handleAdd = useCallback(() => {
		vscode.postMessage({ type: "upsertApiConfiguration", text: "New Profile", apiConfiguration })
	}, [apiConfiguration])

	const handleStartRename = useCallback(
		(name: string) => {
			vscode.postMessage({
				type: "renameApiConfiguration",
				values: { oldName: name, newName: name },
				apiConfiguration,
			})
		},
		[apiConfiguration],
	)

	// --- Prepare props for the active section component ---
	// Gather all props needed by any section component
	const sectionProps = {
		// Props for ApiOptions
		uriScheme,
		apiConfiguration,
		setApiConfigurationField,
		errorMessage,
		setErrorMessage,
		// Props for AutoApproveSettings
		alwaysAllowReadOnly,
		alwaysAllowReadOnlyOutsideWorkspace,
		alwaysAllowWrite,
		alwaysAllowWriteOutsideWorkspace,
		writeDelayMs,
		alwaysAllowBrowser,
		alwaysApproveResubmit,
		requestDelaySeconds,
		alwaysAllowMcp,
		alwaysAllowModeSwitch,
		alwaysAllowSubtasks,
		alwaysAllowExecute,
		allowedCommands,
		setCachedStateField, // Also used by others
		// Props for BrowserSettings
		browserToolEnabled,
		browserViewportSize,
		screenshotQuality,
		remoteBrowserHost,
		remoteBrowserEnabled,
		// Props for CheckpointSettings
		enableCheckpoints,
		// Props for NotificationSettings
		ttsEnabled,
		ttsSpeed,
		soundEnabled,
		soundVolume,
		// Props for ContextManagementSettings
		maxOpenTabsContext,
		maxWorkspaceFiles: maxWorkspaceFiles ?? 200, // Ensure default is passed
		showRooIgnoredFiles,
		maxReadFileLine,
		// Props for TerminalSettings
		terminalOutputLineLimit,
		terminalShellIntegrationTimeout,
		terminalCommandDelay,
		terminalPowershellCounter,
		terminalZshClearEolMark,
		terminalZshOhMy,
		terminalZshP10k,
		terminalZdotdir,
		// Props for ExperimentalSettings
		setExperimentEnabled,
		experiments,
		// Props for LanguageSettings
		language: language || "en", // Ensure default is passed
		// Props for About
		version,
		telemetrySetting,
		setTelemetrySetting,
		// Props for ApiConfigManager (rendered within ApiOptions)
		currentApiConfigName,
		listApiConfigMeta,
		onSelectConfig: (configName: string) =>
			checkUnsaveChanges(() => vscode.postMessage({ type: "loadApiConfiguration", text: configName })),
		onDeleteConfig: (configName: string) =>
			vscode.postMessage({ type: "deleteApiConfiguration", text: configName }),
		onRenameConfig: (oldName: string, newName: string) => {
			vscode.postMessage({
				type: "renameApiConfiguration",
				values: { oldName, newName },
				apiConfiguration, // Pass current cached config
			})
			prevApiConfigName.current = newName // Update ref immediately
		},
		onUpsertConfig: (configName: string) =>
			vscode.postMessage({
				type: "upsertApiConfiguration",
				text: configName,
				apiConfiguration, // Pass current cached config
			}),
	}

	const ActiveSectionComponent = sectionComponentMap[activeSection]

	// --- New Render Logic ---
	return (
		<div className="fixed inset-0 flex flex-col overflow-hidden bg-vscode-sideBar-background text-vscode-foreground">
			{/* Header */}
			<div className="px-5 py-2.5 border-b border-vscode-panel-border flex justify-between items-center flex-shrink-0">
				<h3 className="text-vscode-foreground m-0">{t("settings:header.title")}</h3>
				<div className="flex gap-2">
					<Button
						variant={isSettingValid ? "default" : "secondary"}
						className={!isSettingValid ? "!border-vscode-errorForeground" : ""}
						title={
							!isSettingValid
								? errorMessage
								: isChangeDetected
									? t("settings:header.saveButtonTooltip")
									: t("settings:header.nothingChangedTooltip")
						}
						onClick={handleSubmit}
						disabled={!isChangeDetected || !isSettingValid}
						data-testid="save-button">
						{t("settings:common.save")}
					</Button>
					<Button
						variant="secondary"
						title={t("settings:header.closeButtonTooltip")}
						onClick={() => checkUnsaveChanges(onClose)}>
						{t("settings:common.close")}
					</Button>
				</div>
			</div>

			{/* Main Content Area (Two Columns) */}
			<div className="flex flex-1 overflow-hidden">
				{/* Left Navigation Column */}
				<div className="w-60 border-r border-vscode-panel-border overflow-y-auto p-2 flex-shrink-0">
					{/* Configuration Profile at the top of the left navigation */}
					<div className="mb-3 pb-3 border-b border-vscode-panel-border">
						<div className="flex items-center gap-1">
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="combobox"
										role="combobox"
										className="grow justify-between text-xs"
										data-testid="select-component">
										<div>{currentApiConfigName || t("settings:common.select")}</div>
										<ChevronsUpDown className="opacity-50 h-3 w-3" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
									<Command>
										<CommandInput
											placeholder={t("settings:providers.searchPlaceholder")}
											className="h-9"
										/>
										<CommandList>
											<CommandGroup>
												{listApiConfigMeta?.map((config) => (
													<CommandItem
														key={config.name}
														value={config.name}
														onSelect={(value) => {
															checkUnsaveChanges(() =>
																vscode.postMessage({
																	type: "loadApiConfiguration",
																	text: value,
																}),
															)
														}}>
														{config.name}
														<Check
															className={cn(
																"size-4 p-0.5 ml-auto",
																config.name === currentApiConfigName
																	? "opacity-100"
																	: "opacity-0",
															)}
														/>
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7"
								onClick={handleAdd}
								title={t("settings:providers.addProfile")}>
								<span className="codicon codicon-add text-xs" />
							</Button>
							{currentApiConfigName && (
								<>
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7"
										onClick={() => handleStartRename(currentApiConfigName)}
										title={t("settings:providers.renameProfile")}>
										<span className="codicon codicon-edit text-xs" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7"
										onClick={() => {
											if (listApiConfigMeta.length > 1) {
												vscode.postMessage({
													type: "deleteApiConfiguration",
													text: currentApiConfigName,
												})
											}
										}}
										title={
											listApiConfigMeta.length <= 1
												? t("settings:providers.cannotDeleteOnlyProfile")
												: t("settings:providers.deleteProfile")
										}
										disabled={listApiConfigMeta.length <= 1}>
										<span className="codicon codicon-trash text-xs" />
									</Button>
								</>
							)}
						</div>
					</div>
					<SettingsNav sections={sections} activeSection={activeSection} onSelectSection={setActiveSection} />
				</div>

				{/* Right Content Column */}
				<div className="flex-1 overflow-y-auto">
					{/* Special handling for providers section */}
					{activeSection === "providers" ? (
						<div className="p-5">
							{/* Add section header for providers */}
							<SectionHeader>
								<div className="flex items-center gap-2">
									<span className="codicon codicon-server w-4" />
									<div>{t("settings:sections.providers")}</div>
								</div>
							</SectionHeader>

							{/* Render ApiOptions without its own section header */}
							<ApiOptions {...sectionProps} fromProvidersTab={true} />
						</div>
					) : (
						/* Render other section components with consistent padding */
						ActiveSectionComponent && (
							<div className="p-5">
								<ActiveSectionComponent {...sectionProps} />
							</div>
						)
					)}
				</div>
			</div>

			{/* Unsaved Changes Dialog (unchanged) */}
			<AlertDialog open={isDiscardDialogShow} onOpenChange={setDiscardDialogShow}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							<AlertTriangle className="w-5 h-5 text-yellow-500" />
							{t("settings:unsavedChangesDialog.title")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("settings:unsavedChangesDialog.description")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => onConfirmDialogResult(false)}>
							{t("settings:unsavedChangesDialog.cancelButton")}
						</AlertDialogCancel>
						<AlertDialogAction onClick={() => onConfirmDialogResult(true)}>
							{t("settings:unsavedChangesDialog.discardButton")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
})

export default memo(SettingsView)
