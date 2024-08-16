# Changelog

All notable changes to the mateoScript extension for VSCode will be documented in this file.

## [3.13.0] - XX.XX.XXXX

## [3.12.0] - 19.08.2024

- Added additional status bar for Robot Framework bridge
- Added dynamic loading of command recommendations

## [3.11.0] - 03.08.2023

- Fixed file validation which was broken when file was not in workspace root (TES-2363)
- Fixed: after a script run with a non-successful result level, notification was displayed permanently and HTML report was opened instead of web report.  (TES-2364)
- Fixed: Now quotation marks can surround repository filenames in import statements (e.g. use "./TES-2347.mrepo" as repo) (TES-2374)

## [3.10.3] - 30.03.2023

- Enabled extension to run in web-based version of VS Code

## [3.10.0] - 28.03.2023

- Webpack configured to provide the extension also as a web extension (TES-1986)
- Extension no longer requires additional extension 'techer.open-in-browser' (TES-2267)
- After script run, the report will now be opened in the mateo web interface instead of the local HTML report by default (option 'Open Web Report') (TES-2265)
- Removed obsolete property called "Nullable Property" from extension settings (TES-2291)
- Bugfix: Validating and executing scripts and snippets containing special characters in filename from the VSCode extension is now possible (TES-2165)

## [3.9.1] - 26.09.2022

- Tooltip now also shown for commands where synonym names are used (TES-2226)
- In IntelliSense dropdown, command parameters are now always shown first (TES-2227)

## [3.9.0] - 22.08.2022

### Added

- "Extract Constant" button replacing all occurrences of a selected text sequence

## [3.8.1] - 08.04.2022

### Added

- "rejectUnauthorized" configuration which can be disabled to allow for use with self-signed certificates

## [3.8.0] - 14.03.2022

### Added

- Abort script runs button
- Colors added to VSCode log
- Outline
- Support for HTTPS and Basic Authentication
- Adjustable snippet language through configuration 'mateo.snippetLanguage'
- Code snippets to auto-insert documentation comments ('doc-full-step' and 'doc-parameter-only')
- Tooltips for structural elements (e.g. step, case, for)

## [3.7.7] - 10.09.2021

### Added

- Highlighting for 'option'
- Tooltips for commands

## [3.7.5] - 15.06.2021

### Added

- Extension version now corresponds to the mateo version

### Changed

- Parameters highlighting adjusted. Umlauts and hyphens are now allowed.

## [Unreleased]

- Initial release
- Support https and basic authentication
