# 🎮 Aura - Universal Game Launcher

A beautiful, modern desktop game launcher that automatically detects and organizes games from Steam, Epic Games, and Ubisoft Connect. Built with Tauri and React.

## ✨ Features

### 🎯 **Universal Game Detection**
- **Steam** - Multi-drive library detection with VDF parsing
- **Epic Games** - Automatic manifest scanning
- **Ubisoft Connect** - Registry-based game discovery
- **Local Games** - Scan any folder for executable games

### 🖥️ **Desktop Integration**
- **System Tray** - Native Windows tray integration
- **Close to Tray** - Minimize to system tray
- **Auto-Start** - Background operation
- **Quick Launch** - One-click game launching

### 🔄 **Real-Time Updates**
- **File Watcher** - Automatic library updates
- **Live Monitoring** - Detect new installations instantly
- **Smart Caching** - Metadata caching with IGDB integration
- **Event-Driven** - No manual refresh needed

### 🎨 **Beautiful UI**
- **Modern Design** - Glassmorphism and blur effects
- **Dark Theme** - Eye-friendly midnight theme
- **Responsive** - Smooth animations and transitions
- **Onboarding** - First-time user experience

### 📊 **Game Management**
- **Search** - Instant game search
- **Filtering** - Genre and playtime filters
- **Statistics** - Playtime and game stats
- **Recent Games** - Track recently played

## 🚀 Installation

### 📦 Download Installer
1. Download the latest release from [Releases](https://github.com/yourusername/aura/releases)
2. Run `aura_0.1.0_x64-setup.exe` (Windows)
3. Follow the installation wizard
4. Launch Aura from Start Menu or system tray

### 🔧 Build from Source
```bash
# Clone the repository
git clone https://github.com/yourusername/aura.git
cd aura

# Install dependencies
npm install
cd src-tauri && cargo install --path .

# Run in development
npm run tauri dev

# Build for production
npm run tauri build
```

## 🎮 Usage

### First Launch
1. **Onboarding** - Aura automatically scans for games
2. **Library Discovery** - Detects Steam, Epic, and Ubisoft games
3. **Metadata Enrichment** - Fetches game covers and genres
4. **Ready to Play** - Launch games with one click

### Features
- **Search Games** - Use the search bar to find games
- **Filter by Genre** - Browse games by category
- **Playtime Modes** - Filter by weekday/weekend games
- **System Tray** - Minimize to tray, quick access
- **Auto-Updates** - Library updates automatically

## 🛠️ Development

### Tech Stack
- **Frontend**: React, TypeScript, TailwindCSS
- **Backend**: Rust, Tauri
- **Database**: LocalStorage, JSON files
- **APIs**: IGDB, Steam, Epic, Ubisoft

### Architecture
```
src/
├── App.tsx              # Main application
├── Onboarding.tsx       # First-time setup
├── GameCard.tsx         # Game component
├── Settings.tsx         # Settings panel
├── Stats.tsx           # Statistics view
├── Recent.tsx          # Recent games
└── cache.ts           # Metadata caching

src-tauri/
├── src/
│   └── lib.rs          # Core Rust backend
├── Cargo.toml          # Rust dependencies
├── tauri.conf.json     # Tauri configuration
└── icons/              # Application icons
```

### Key Features
- **Registry Detection** - Dynamic path discovery
- **File Watching** - Real-time library monitoring
- **Metadata Caching** - IGDB API integration
- **System Integration** - Tray, window management
- **Cross-Platform** - Windows registry support

## 📋 Requirements

### System Requirements
- **Windows 10/11** (64-bit)
- **Steam** (optional, for Steam games)
- **Epic Games Launcher** (optional, for Epic games)
- **Ubisoft Connect** (optional, for Ubisoft games)

### Development Requirements
- **Node.js** 18+
- **Rust** 1.70+
- **Tauri CLI** 2.0+

## 🔧 Configuration

### Game Paths
Aura automatically detects game installations via:
- **Windows Registry** - Steam, Epic, Ubisoft paths
- **VDF Files** - Steam library folders
- **ProgramData** - Epic Games manifests
- **Fallback Paths** - Default installation locations

### Settings
- **Theme** - Midnight dark theme
- **Tray Behavior** - Close to tray option
- **Library Scanning** - Automatic detection
- **Metadata** - IGDB API integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow Rust and TypeScript best practices
- Use conventional commit messages
- Add tests for new features
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Tauri** - Cross-platform desktop framework
- **React** - UI framework
- **IGDB** - Game metadata API
- **Steam** - Game platform integration
- **Epic Games** - Game platform integration
- **Ubisoft** - Game platform integration

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/aura/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/aura/discussions)
- **Releases**: [GitHub Releases](https://github.com/yourusername/aura/releases)

---

**🎮 Aura - Your Universal Game Library**
