/**
 * WCAG 2.2 AA Color Contrast Validator
 * Ensures all color combinations meet accessibility standards
 */

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  isLargeText?: boolean;
  minimumRequired: number;
}

export class ContrastValidator {
  private static instance: ContrastValidator;

  static getInstance(): ContrastValidator {
    if (!ContrastValidator.instance) {
      ContrastValidator.instance = new ContrastValidator();
    }
    return ContrastValidator.instance;
  }

  /**
   * Convert hex color to RGB values
   */
  private hexToRgb(hex: string): RGB {
    const normalized = hex.replace('#', '');
    if (normalized.length === 3) {
      // Handle short hex format (#abc -> #aabbcc)
      const expandedHex = normalized.split('').map(char => char + char).join('');
      const bigint = parseInt(expandedHex, 16);
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
      };
    }

    const bigint = parseInt(normalized, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  }

  /**
   * Convert linear color channel to sRGB
   */
  private toLinear(value: number): number {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  }

  /**
   * Calculate relative luminance according to WCAG formula
   */
  private getRelativeLuminance(color: string | RGB): number {
    let rgb: RGB;

    if (typeof color === 'string') {
      rgb = this.hexToRgb(color);
    } else {
      rgb = color;
    }

    const [linearR, linearG, linearB] = [
      this.toLinear(rgb.r),
      this.toLinear(rgb.g),
      this.toLinear(rgb.b)
    ];

    // WCAG formula: 0.2126 * R + 0.7152 * G + 0.0722 * B
    return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
  }

  /**
   * Calculate contrast ratio between two colors
   */
  calculateContrastRatio(foreground: string, background: string): number {
    const lumFg = this.getRelativeLuminance(foreground);
    const lumBg = this.getRelativeLuminance(background);

    const lighter = Math.max(lumFg, lumBg);
    const darker = Math.min(lumFg, lumBg);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Validate color contrast according to WCAG 2.2 AA standards
   */
  validateContrast(
    foreground: string,
    background: string,
    isLargeText: boolean = false
  ): ContrastResult {
    const ratio = this.calculateContrastRatio(foreground, background);

    // WCAG 2.2 AA requirements:
    // - Normal text: 4.5:1
    // - Large text (18pt+ or 14pt+ bold): 3:1
    // - AAA requirements: 7:1 normal, 4.5:1 large
    const minimumRequired = isLargeText ? 3.0 : 4.5;
    const aaaRequired = isLargeText ? 4.5 : 7.0;

    return {
      ratio,
      passesAA: ratio >= minimumRequired,
      passesAAA: ratio >= aaaRequired,
      isLargeText,
      minimumRequired
    };
  }

  /**
   * Batch validate multiple color combinations
   */
  validateMultiple(combinations: Array<{
    foreground: string;
    background: string;
    isLargeText?: boolean;
    label?: string;
  }>): Array<ContrastResult & { label?: string }> {
    return combinations.map(({ foreground, background, isLargeText = false, label }) => ({
      ...this.validateContrast(foreground, background, isLargeText),
      label
    }));
  }

  /**
   * Get suggested fixes for failing contrast ratios
   */
  getSuggestions(
    foreground: string,
    background: string,
    isLargeText: boolean = false
  ): {
    currentRatio: number;
    targetRatio: number;
    suggestions: string[];
  } {
    const result = this.validateContrast(foreground, background, isLargeText);

    if (result.passesAA) {
      return {
        currentRatio: result.ratio,
        targetRatio: result.minimumRequired,
        suggestions: ['PASS: Contrast ratio meets WCAG 2.2 AA standards']
      };
    }

    const suggestions = [
      `FAIL: Current ratio: ${result.ratio.toFixed(2)}:1 (needs ${result.minimumRequired}:1)`,
      'FIXES: Suggested fixes:',
      '• Darken the foreground color',
      '• Lighten the background color',
      '• Increase font weight or size (may lower requirements to 3:1)',
      '• Consider using a high-contrast color scheme'
    ];

    return {
      currentRatio: result.ratio,
      targetRatio: result.minimumRequired,
      suggestions
    };
  }

  /**
   * Validate theme colors against WCAG standards
   */
  validateTheme(theme: Record<string, string>): {
    results: Array<ContrastResult & { combination: string }>;
    failures: Array<ContrastResult & { combination: string }>;
    passRate: number;
  } {
    const combinations = [
      { fg: theme.text || '#1f1f1f', bg: theme.surface || '#ffffff', label: 'Primary text on surface' },
      { fg: theme.text || '#1f1f1f', bg: theme.card || '#ffffff', label: 'Primary text on card' },
      { fg: theme.textLight || '#ffffff', bg: theme.primary || '#ff7664', label: 'Light text on primary button' },
      { fg: theme.text || '#1f1f1f', bg: theme.secondary || '#e093ff', label: 'Dark text on secondary button' },
      { fg: theme.text || '#1f1f1f', bg: theme.success || '#6cc88b', label: 'Dark text on success button' },
      { fg: theme.textLight || '#ffffff', bg: theme.info || '#5398ff', label: 'Light text on info button' }
    ];

    const results = combinations.map(({ fg, bg, label }) => ({
      ...this.validateContrast(fg, bg),
      combination: label
    }));

    const failures = results.filter(result => !result.passesAA);
    const passRate = ((results.length - failures.length) / results.length) * 100;

    return {
      results,
      failures,
      passRate
    };
  }

  /**
   * Generate accessibility report for color usage
   */
  generateReport(validationResults: Array<ContrastResult & { combination: string }>): {
    summary: {
      totalTests: number;
      passed: number;
      failed: number;
      passRate: string;
    };
    details: Array<{
      test: string;
      status: 'PASS' | 'FAIL';
      ratio: string;
      required: string;
    }>;
  } {
    const totalTests = validationResults.length;
    const passed = validationResults.filter(r => r.passesAA).length;
    const failed = totalTests - passed;

    return {
      summary: {
        totalTests,
        passed,
        failed,
        passRate: `${((passed / totalTests) * 100).toFixed(1)}%`
      },
      details: validationResults.map(result => ({
        test: result.combination,
        status: result.passesAA ? 'PASS' : 'FAIL',
        ratio: `${result.ratio.toFixed(2)}:1`,
        required: `${result.minimumRequired}:1`
      }))
    };
  }
}

// Export singleton instance
export const contrastValidator = ContrastValidator.getInstance();

// Helper functions for common use cases
export const validateContrast = (
  foreground: string,
  background: string,
  isLargeText?: boolean
) => contrastValidator.validateContrast(foreground, background, isLargeText);

export const checkThemeCompliance = (theme: Record<string, string>) =>
  contrastValidator.validateTheme(theme);

export const getContrastSuggestions = (
  foreground: string,
  background: string,
  isLargeText?: boolean
) => contrastValidator.getSuggestions(foreground, background, isLargeText);