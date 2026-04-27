# Core Directives for Dagatal (Retro Calendar)

1. **TRUE NATIVE RESOLUTION (320x200)**: EVERYTHING must be drawn in actual, true 320x200 pixel resolution. This rule must NEVER be broken. 
2. **Integer Layouts**: No sub-pixels or fractional pixels (like `1fr` or `%`) are allowed in CSS grid/flex layouts, as they break the physical pixel boundaries when scaled up. Explicit integer pixel widths must always be used.
3. **Integer Scaling**: The main application wrapper must ONLY be scaled by an exact integer multiplier (`Math.floor(scale)`) to prevent physical pixel anti-aliasing or blurring of the low-res elements across high-res monitors.
4. **Discrete Cursor Movement**: The custom mouse cursor coordinates must be rounded to the nearest whole integer (`Math.floor`) to ensure the pointer stays locked to the 320x200 grid.
5. **PNG Bitmap Fonts (Zero Anti-Aliasing)**: All text must be rendered using PNG-based sprite sheets (bitmap fonts) via the `PixelText` component. Standard browser vector fonts are prohibited as they introduce sub-pixel smoothing and vary across platforms.
6. **Unified Pixel Size**: Every single visual element (text characters, cursor pixels, and grid lines) must be exactly 1:1 with the native 320x200 grid. No element may have a "higher resolution" look than any other.
