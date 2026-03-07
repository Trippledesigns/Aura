# 📝 Changelog

All notable changes to Aura will be documented in this file.

## [0.3.1] - 2025-03-07

### 📮 **NEW: Feedback System**
- ✅ **In-App Feedback**: Send bug reports, feature requests, and general feedback
- ✅ **Feedback Types**: Bug Report, Feature Request, General Feedback categories
- ✅ **Easy Access**: Feedback button in Settings About section
- ✅ **Modern UI**: Clean modal interface with Discord-style embeds
- ✅ **Auto-Close**: Feedback modal closes automatically after submission
- ✅ **Visual Feedback**: Loading states and success confirmation

### 🎨 **UI/UX Improvements**
- ✅ **Settings Integration**: Seamless feedback access from About section
- ✅ **Responsive Design**: Mobile-friendly feedback interface
- ✅ **Loading States**: Visual feedback during submission
- ✅ **Error Handling**: Graceful fallback for failed submissions

### 🔧 **Technical Updates**
- ✅ **TypeScript**: Proper type safety for feedback system
- ✅ **Component Architecture**: Reusable Feedback modal component
- ✅ **State Management**: Clean React state handling
- ✅ **Webhook Integration**: Discord-compatible embed formatting

---

## [0.3.0] - 2025-03-07

### 🎮 **NEW: Game Uninstall Feature**
- ✅ **Platform Support**: Steam, Epic Games, Ubisoft Connect, GOG
- ✅ **Two-Click Confirmation**: Prevents accidental uninstalls
- ✅ **UI Integration**: Seamless uninstall button in game cards
- ✅ **Registry Integration**: GOG uninstaller detection via Windows registry

### 🎨 **UI/UX Improvements**
- ✅ **Uninstall Button**: Red-themed button with trash icon
- ✅ **Visual Feedback**: Hover states and confirmation animations
- ✅ **Confirmation Flow**: "Sure?" text on second click
- ✅ **Auto-Reset**: 3-second confirmation timeout

### 🔧 **Technical Updates**
- ✅ **Rust Backend**: Cross-platform command execution
- ✅ **Type Safety**: Proper TypeScript interfaces
- ✅ **Error Handling**: Robust error management
- ✅ **State Management**: Clean game removal logic

### 🐛 **Bug Fixes**
- ✅ **Syntax Errors**: Fixed all Rust compilation issues
- ✅ **Type Annotations**: Corrected winreg usage
- ✅ **Variable Naming**: Resolved shadowing conflicts
- ✅ **Warnings Cleanup**: Addressed unused variables

---

## [0.2.5] - Previous Release

### 🎮 **Core Features**
- ✅ **Game Detection**: Steam, Epic, Ubisoft, GOG, Local games
- ✅ **System Tray**: Native Windows tray integration
- ✅ **Real-Time Updates**: File watcher for library changes
- ✅ **Beautiful UI**: Glassmorphism design with dark theme
- ✅ **Game Management**: Search, filtering, statistics
- ✅ **Metadata**: IGDB integration for game covers and genres
