# NextRound 1.13.0

## Remember how it went

Add an optional note to any saved workout result, across all six workout types. Record observations in up to 2,000 characters of plain text; edit or clear it later. Search history now finds notes as well as exercise names and descriptions. Notes stay on your Mac and do not change your recorded workout, score, exercise usage or comparisons. Repeat from setup loads only the workout configuration.

## Fixes

- Refresh history directly when a displayed result changes or disappears. A stale note edit asks you to review the current saved note before replacing it; refresh keeps your proposed text.
- Deleting a result or closing a result removed by refresh restores keyboard focus to the original control when available, otherwise the history heading.
- Long result details and notes scroll inside a bounded dialog, keeping the title and actions visible with room around controls and scrollbars.
- Unsaved notes offer save, discard and keep-editing choices. Native quit and update installation respect an open note editor; minimizing keeps the editor intact.

## Storage and distribution

Existing history needs no conversion. Notes are optional metadata, never a change to the performed session. Failed reads, writes and unsupported data do not erase existing history. Use 1.13.0 or later when editing history containing notes; older native builds reject unsupported fields rather than overwrite them.

Apple Silicon Macs running macOS 14 or later. GitHub copies update through the signed NextRound updater; App Store and TestFlight copies update through Apple. No account, sync or new external service is required.
