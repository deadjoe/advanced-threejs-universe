# CLAUDE.md - Three.js Universe Visualization Project

## Project Structure
- **Main Files**: index.html, js/minimal.js (currently used), js/main.js (full implementation)
- **Run Project**: Open with a web server (VSCode Live Server) due to module loading requirements

## Command Shortcuts
- No build/lint/test commands - pure client-side Three.js application
- Run project: Use Live Server extension in VSCode or any HTTP server

## Code Style Guidelines
- **Naming**: camelCase for variables and functions
- **Formatting**: 4-space indentation
- **Organization**: Group functions by purpose (creation, update, interaction)
- **Comments**: Descriptive comments before function blocks
- **Architecture**: Use Group-based organization for scene components
- **Functions**: Prefix creation functions with "create", update functions with "update"

## Design Principles
- Place all celestial bodies in solarSystemGroup rather than directly in scene
- Use userData to store metadata for celestial objects
- Use cumulative rotation values to avoid reset during position updates
- Follow Three.js best practices for performance optimization

## Performance Tips
- Use BufferGeometry instead of Geometry
- Minimize transparent objects
- Adjust geometry detail level as needed
- Save state values to avoid repeated calculations