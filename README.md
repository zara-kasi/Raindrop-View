# Raindrop.io Integration for Obsidian

A powerful Obsidian plugin that seamlessly integrates your Raindrop.io bookmarks into your notes. Display your saved bookmarks, collections, and perform real-time searches directly within Obsidian using code blocks and inline links.

## Features

- 📑 **Display Bookmarks**: Show your Raindrop.io bookmarks in beautiful card or table layouts
- 🗂️ **Collection Management**: View and organize your bookmark collections
- 🔍 **Real-time Search**: Search through your bookmarks with live results
- 🎨 **Multiple Layouts**: Choose between card grid or table view
- 🖼️ **Rich Content**: Display cover images, tags, excerpts, and metadata
- ⚡ **Performance**: Built-in caching for fast loading
- 🔗 **Inline Links**: Use simple `raindrop:` links for quick access
- ⚙️ **Customizable**: Extensive settings to control appearance and behavior

## Installation

### Manual Installation

1. Download the latest release from the [Releases](https://github.com/yourusername/obsidian-raindrop-plugin/releases) page
2. Extract the files to your Obsidian plugins folder: `{VaultFolder}/.obsidian/plugins/raindrop-integration/`
3. Enable the plugin in Obsidian Settings → Community Plugins

### From Community Plugins (Coming Soon)

Search for "Raindrop.io Integration" in the Community Plugins browser.

## Setup

### 1. Get Your API Token

1. Go to [Raindrop.io Integrations](https://app.raindrop.io/settings/integrations)
2. Click "Create new app"
3. Fill in any name (e.g., "Obsidian Integration")
4. Copy the "Test token" that appears
5. Paste it in the plugin settings

### 2. Configure Settings

Open Obsidian Settings → Community Plugins → Raindrop.io Integration to configure:

- **API Token**: Your Raindrop.io API token
- **Default Layout**: Choose between card or table view
- **Grid Columns**: Number of columns for card layout (1-4)
- **Display Options**: Toggle cover images, tags, excerpts, and domains
- **Items Per Page**: Control how many items load at once (5-50)

## Usage

### Code Blocks

#### Display Bookmarks

```raindrop
collection: 0
layout: card
perpage: 10
```

#### Display Specific Collection

```raindrop
collection: 12345
layout: table
perpage: 20
```

#### Show Collections

```raindrop
type: collections
layout: card
```

#### User Information

```raindrop
type: user
```

#### Interactive Search

```raindrop-search
layout: card
perpage: 15
```

### Inline Links

Use `raindrop:` links for quick embedding:

- `[My Bookmarks](raindrop:bookmarks)` - All bookmarks
- `[Collection](raindrop:collection/12345)` - Specific collection
- `[Collections](raindrop:collections)` - All collections
- `[Profile](raindrop:user)` - User information

### Code Block Parameters

| Parameter | Description | Default | Options |
|-----------|-------------|---------|---------|
| `type` | Content type | `bookmarks` | `bookmarks`, `collections`, `user`, `search` |
| `collection` | Collection ID | `0` (all) | Any collection ID |
| `layout` | Display layout | `card` | `card`, `table` |
| `perpage` | Items per page | `20` | `5-50` |
| `page` | Page number | `0` | Any number |
| `search` | Search query | - | Any text |

## Examples

### Basic Bookmark Display

```raindrop
collection: 0
layout: card
perpage: 12
```

This displays the first 12 bookmarks from all collections in a card layout.

### Collection Overview

```raindrop
type: collections
layout: card
```

Shows all your collections with cover images, titles, and bookmark counts.

### Search Interface

```raindrop-search
layout: card
perpage: 20
```

Creates an interactive search box that lets you search through all bookmarks in real-time.

### Table View for Specific Collection

```raindrop
collection: 12345
layout: table
perpage: 25
```

Displays bookmarks from collection 12345 in a compact table format.

## Layouts

### Card Layout
- **Grid Display**: Configurable columns (1-4)
- **Rich Content**: Cover images, titles, excerpts, tags, and dates
- **Interactive**: Clickable titles that open bookmarks
- **Responsive**: Adapts to different screen sizes

### Table Layout
- **Compact View**: More bookmarks in less space
- **Sortable**: Clean tabular format
- **Essential Info**: Title, domain, tags, and date
- **Efficient**: Perfect for large bookmark lists

## Customization

### CSS Variables

Customize the appearance by adding CSS snippets:

```css
.raindrop-cards-grid {
  --raindrop-grid-columns: 3; /* Override column count */
  gap: 1.5em; /* Adjust spacing */
}

.raindrop-bookmark-card {
  border-radius: 8px; /* Custom border radius */
  box-shadow: 0 2px 8px rgba(0,0,0,0.1); /* Custom shadow */
}
```

### Theme Integration

The plugin uses Obsidian's CSS variables for seamless theme integration:

- `--background-primary-alt` for card backgrounds
- `--interactive-normal` for borders and links
- `--text-normal` and `--text-muted` for text colors
- `--font-family` for consistent typography

## Performance

- **Caching**: API responses are cached for 5 minutes
- **Lazy Loading**: Only loads visible content
- **Efficient Rendering**: Minimal DOM manipulation
- **Rate Limiting**: Respects API limits

## Troubleshooting

### Common Issues

**Plugin won't load**
- Check if all files are in the correct directory
- Verify Obsidian version is 0.15.0 or higher
- Check Developer Console for error messages

**"Invalid API Token" error**
- Verify your API token is correct
- Make sure you're using the "Test token" from Raindrop.io
- Check your internet connection

**Bookmarks not showing**
- Verify the collection ID exists
- Check if your Raindrop.io account has bookmarks
- Try reducing the `perpage` parameter

**Search not working**
- Ensure you're using the `raindrop-search` code block
- Type at least 2 characters to trigger search
- Check your API token permissions

### Debug Mode

Enable debug logging in the Developer Console:

```javascript
// In Developer Console
localStorage.setItem('raindrop-debug', 'true');
```

## API Reference

The plugin uses the [Raindrop.io API v1](https://developer.raindrop.io/):

- **GET /collections** - Retrieve collections
- **GET /raindrops/{collection}** - Get bookmarks from collection
- **GET /raindrops/0** - Search all bookmarks
- **GET /user** - Get user information

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the plugin
4. Copy files to your Obsidian plugins folder for testing

### Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation for changes
- Test with different Obsidian themes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/obsidian-raindrop-plugin/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/obsidian-raindrop-plugin/discussions)
- 📖 **Documentation**: [Wiki](https://github.com/yourusername/obsidian-raindrop-plugin/wiki)

## Changelog

### v1.0.0
- Initial release
- Basic bookmark display
- Collection management
- Search functionality
- Multiple layouts
- Inline link support

## Acknowledgments

- [Raindrop.io](https://raindrop.io) for the excellent bookmark service
- [Obsidian](https://obsidian.md) for the powerful note-taking platform
- The Obsidian plugin development community

---

Made with ❤️ for the Obsidian community
