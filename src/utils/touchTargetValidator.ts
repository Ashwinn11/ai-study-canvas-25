/**
 * WCAG 2.2 AA Touch Target Validation
 * Ensures all interactive elements meet minimum size and spacing requirements
 */

// Web environment - use default touch target sizes
const touchTargets = {
  minimum: 44,
  comfortable: 48,
  large: 56
};

export interface TouchTargetDimensions {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export interface TouchTargetValidationResult {
  isValid: boolean;
  meetsMinimum: boolean;
  meetsComfortable: boolean;
  actualSize: TouchTargetDimensions;
  requiredSize: TouchTargetDimensions;
  issues: string[];
  suggestions: string[];
}

export interface TouchTargetSpacingResult {
  isValid: boolean;
  minimumSpacing: number;
  actualSpacing: number;
  conflictsDetected: TouchTargetConflict[];
}

export interface TouchTargetConflict {
  element1: string;
  element2: string;
  spacing: number;
  minimumRequired: number;
  severity: 'critical' | 'warning' | 'info';
}

export class TouchTargetValidator {
  private static instance: TouchTargetValidator;
  private readonly screenDimensions = { width: window.innerWidth, height: window.innerHeight };

  static getInstance(): TouchTargetValidator {
    if (!TouchTargetValidator.instance) {
      TouchTargetValidator.instance = new TouchTargetValidator();
    }
    return TouchTargetValidator.instance;
  }

  /**
   * WCAG 2.2 Level AA Target Size requirements:
   * - Minimum 24×24 CSS pixels (equivalent to 44×44 points on mobile)
   * - Exception for inline text links
   * - Exception when target is user agent controlled
   * - Exception when presentation is essential
   */
  private getMinimumRequirements(
    elementType: 'button' | 'link' | 'input' | 'custom' = 'custom',
    isInlineText: boolean = false
  ): TouchTargetDimensions {
    // Inline text links have more lenient requirements
    if (isInlineText && elementType === 'link') {
      return {
        width: 24, // CSS pixels
        height: 24
      };
    }

    // Standard WCAG 2.2 AA requirement
    return {
      width: touchTargets.minimum, // 44px (iOS/Android standard)
      height: touchTargets.minimum
    };
  }

  /**
   * Validate a single touch target
   */
  validateTouchTarget(
    dimensions: TouchTargetDimensions,
    options: {
      elementType?: 'button' | 'link' | 'input' | 'custom';
      isInlineText?: boolean;
      label?: string;
      isPrimary?: boolean;
    } = {}
  ): TouchTargetValidationResult {
    const {
      elementType = 'custom',
      isInlineText = false,
      label = 'Element',
      isPrimary = false
    } = options;

    const required = this.getMinimumRequirements(elementType, isInlineText);
    const comfortable = {
      width: touchTargets.comfortable,
      height: touchTargets.comfortable
    };

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check minimum size requirements
    const meetsMinimum = dimensions.width >= required.width &&
                        dimensions.height >= required.height;

    if (!meetsMinimum) {
      if (dimensions.width < required.width) {
        issues.push(`Width ${dimensions.width}px is below minimum ${required.width}px`);
        suggestions.push(`Increase width to at least ${required.width}px`);
      }
      if (dimensions.height < required.height) {
        issues.push(`Height ${dimensions.height}px is below minimum ${required.height}px`);
        suggestions.push(`Increase height to at least ${required.height}px`);
      }
    }

    // Check comfortable size recommendations
    const meetsComfortable = dimensions.width >= comfortable.width &&
                            dimensions.height >= comfortable.height;

    if (meetsMinimum && !meetsComfortable) {
      suggestions.push(
        `Consider increasing size to ${comfortable.width}×${comfortable.height}px for better usability`
      );
    }

    // Primary actions should use larger targets
    if (isPrimary && !meetsComfortable) {
      issues.push('Primary actions should use comfortable touch target sizes');
      suggestions.push(`Use ${touchTargets.large}×${touchTargets.large}px for primary actions`);
    }

    // Web platform recommendations
    if (dimensions.width < 44) {
      suggestions.push('Web accessibility guidelines recommend 44×44px minimum');
    }

    return {
      isValid: meetsMinimum,
      meetsMinimum,
      meetsComfortable,
      actualSize: dimensions,
      requiredSize: required,
      issues,
      suggestions
    };
  }

  /**
   * Validate spacing between touch targets
   */
  validateTouchTargetSpacing(
    targets: Array<TouchTargetDimensions & { id: string; label?: string }>,
    minimumSpacing: number = 8
  ): TouchTargetSpacingResult {
    const conflicts: TouchTargetConflict[] = [];

    for (let i = 0; i < targets.length; i++) {
      for (let j = i + 1; j < targets.length; j++) {
        const target1 = targets[i];
        const target2 = targets[j];

        if (!target1.x || !target1.y || !target2.x || !target2.y) {
          continue; // Skip if position information is missing
        }

        const distance = this.calculateDistance(target1, target2);

        if (distance < minimumSpacing) {
          const severity = this.getConflictSeverity(distance, minimumSpacing);

          conflicts.push({
            element1: target1.label || target1.id,
            element2: target2.label || target2.id,
            spacing: distance,
            minimumRequired: minimumSpacing,
            severity
          });
        }
      }
    }

    return {
      isValid: conflicts.length === 0,
      minimumSpacing,
      actualSpacing: conflicts.length > 0 ? Math.min(...conflicts.map(c => c.spacing)) : minimumSpacing,
      conflictsDetected: conflicts
    };
  }

  /**
   * Calculate distance between two touch targets
   */
  private calculateDistance(
    target1: TouchTargetDimensions,
    target2: TouchTargetDimensions
  ): number {
    if (!target1.x || !target1.y || !target2.x || !target2.y) {
      return Infinity;
    }

    // Calculate edge-to-edge distance
    const left1 = target1.x;
    const right1 = target1.x + target1.width;
    const top1 = target1.y;
    const bottom1 = target1.y + target1.height;

    const left2 = target2.x;
    const right2 = target2.x + target2.width;
    const top2 = target2.y;
    const bottom2 = target2.y + target2.height;

    // Check if targets overlap
    if (!(right1 < left2 || right2 < left1 || bottom1 < top2 || bottom2 < top1)) {
      return 0; // Overlapping
    }

    // Calculate minimum distance
    const horizontalDistance = Math.max(0, Math.max(left1 - right2, left2 - right1));
    const verticalDistance = Math.max(0, Math.max(top1 - bottom2, top2 - bottom1));

    return Math.sqrt(horizontalDistance ** 2 + verticalDistance ** 2);
  }

  /**
   * Determine conflict severity based on spacing
   */
  private getConflictSeverity(
    actualSpacing: number,
    minimumSpacing: number
  ): 'critical' | 'warning' | 'info' {
    const ratio = actualSpacing / minimumSpacing;

    if (ratio < 0.5) return 'critical';  // Less than 50% of required spacing
    if (ratio < 0.8) return 'warning';   // Less than 80% of required spacing
    return 'info';                       // Close to required spacing
  }

  /**
   * Validate touch targets within a screen or container
   */
  validateScreen(
    targets: Array<TouchTargetDimensions & {
      id: string;
      label?: string;
      elementType?: 'button' | 'link' | 'input' | 'custom';
      isPrimary?: boolean;
    }>,
    options: {
      minimumSpacing?: number;
      containerWidth?: number;
      containerHeight?: number;
    } = {}
  ): {
    targetValidation: Array<TouchTargetValidationResult & { id: string; label?: string }>;
    spacingValidation: TouchTargetSpacingResult;
    screenUtilization: {
      densityScore: number;
      recommendations: string[];
    };
    overallCompliance: {
      passRate: number;
      criticalIssues: number;
      warningCount: number;
      status: 'pass' | 'warning' | 'fail';
    };
  } {
    const {
      minimumSpacing = 8,
      containerWidth = this.screenDimensions.width,
      containerHeight = this.screenDimensions.height
    } = options;

    // Validate individual targets
    const targetValidation = targets.map(target => ({
      ...this.validateTouchTarget(target, {
        elementType: target.elementType,
        label: target.label,
        isPrimary: target.isPrimary
      }),
      id: target.id,
      label: target.label
    }));

    // Validate spacing
    const spacingValidation = this.validateTouchTargetSpacing(targets, minimumSpacing);

    // Calculate screen utilization
    const totalTargetArea = targets.reduce((sum, target) =>
      sum + (target.width * target.height), 0
    );
    const screenArea = containerWidth * containerHeight;
    const densityScore = (totalTargetArea / screenArea) * 100;

    const screenUtilization = {
      densityScore,
      recommendations: this.getScreenUtilizationRecommendations(densityScore, targets.length)
    };

    // Calculate overall compliance
    const passCount = targetValidation.filter(t => t.isValid).length;
    const passRate = (passCount / targetValidation.length) * 100;
    const criticalIssues = spacingValidation.conflictsDetected.filter(c => c.severity === 'critical').length;
    const warningCount = spacingValidation.conflictsDetected.filter(c => c.severity === 'warning').length;

    let status: 'pass' | 'warning' | 'fail' = 'pass';
    if (passRate < 100 || criticalIssues > 0) {
      status = 'fail';
    } else if (warningCount > 0 || passRate < 100) {
      status = 'warning';
    }

    return {
      targetValidation,
      spacingValidation,
      screenUtilization,
      overallCompliance: {
        passRate,
        criticalIssues,
        warningCount,
        status
      }
    };
  }

  /**
   * Get recommendations for screen utilization
   */
  private getScreenUtilizationRecommendations(
    densityScore: number,
    targetCount: number
  ): string[] {
    const recommendations: string[] = [];

    if (densityScore > 30) {
      recommendations.push('Screen appears crowded. Consider reducing number of interactive elements.');
    }

    if (densityScore < 5 && targetCount > 2) {
      recommendations.push('Touch targets could be larger for better accessibility.');
    }

    if (targetCount > 10) {
      recommendations.push('Consider grouping related actions or using navigation patterns.');
    }

    return recommendations;
  }

  /**
   * Generate accessibility report for touch targets
   */
  generateReport(validationResults: ReturnType<TouchTargetValidator['validateScreen']>): {
    summary: {
      totalTargets: number;
      validTargets: number;
      invalidTargets: number;
      passRate: string;
      status: string;
    };
    issues: Array<{
      severity: 'critical' | 'warning' | 'info';
      description: string;
      recommendation: string;
    }>;
    wcagCompliance: {
      level: 'AA' | 'AAA' | 'Non-compliant';
      criteria: string[];
    };
  } {
    const { targetValidation, spacingValidation, overallCompliance } = validationResults;

    const issues: Array<{
      severity: 'critical' | 'warning' | 'info';
      description: string;
      recommendation: string;
    }> = [];

    // Add target size issues
    targetValidation.forEach(target => {
      target.issues.forEach(issue => {
        issues.push({
          severity: target.meetsMinimum ? 'warning' : 'critical',
          description: `${target.label || target.id}: ${issue}`,
          recommendation: target.suggestions[0] || 'Increase touch target size'
        });
      });
    });

    // Add spacing issues
    spacingValidation.conflictsDetected.forEach(conflict => {
      issues.push({
        severity: conflict.severity,
        description: `Insufficient spacing between ${conflict.element1} and ${conflict.element2} (${conflict.spacing.toFixed(1)}px)`,
        recommendation: `Increase spacing to at least ${conflict.minimumRequired}px`
      });
    });

    // Determine WCAG compliance level
    let wcagLevel: 'AA' | 'AAA' | 'Non-compliant' = 'Non-compliant';
    const criteria: string[] = [];

    if (overallCompliance.passRate === 100 && overallCompliance.criticalIssues === 0) {
      wcagLevel = 'AA';
      criteria.push('2.5.5 Target Size (Level AA)');
    }

    if (wcagLevel === 'AA' && overallCompliance.warningCount === 0) {
      wcagLevel = 'AAA';
      criteria.push('2.5.5 Target Size (Level AAA)');
    }

    return {
      summary: {
        totalTargets: targetValidation.length,
        validTargets: targetValidation.filter(t => t.isValid).length,
        invalidTargets: targetValidation.filter(t => !t.isValid).length,
        passRate: `${overallCompliance.passRate.toFixed(1)}%`,
        status: overallCompliance.status
      },
      issues,
      wcagCompliance: {
        level: wcagLevel,
        criteria
      }
    };
  }
}

// Export singleton instance
export const touchTargetValidator = TouchTargetValidator.getInstance();

// Helper functions
export const validateTouchTarget = (
  dimensions: TouchTargetDimensions,
  options?: {
    elementType?: 'button' | 'link' | 'input' | 'custom';
    isInlineText?: boolean;
    label?: string;
    isPrimary?: boolean;
  }
) => touchTargetValidator.validateTouchTarget(dimensions, options);

export const validateTouchTargetSpacing = (
  targets: Array<TouchTargetDimensions & { id: string; label?: string }>,
  minimumSpacing?: number
) => touchTargetValidator.validateTouchTargetSpacing(targets, minimumSpacing);

export const validateScreen = (
  targets: Array<TouchTargetDimensions & {
    id: string;
    label?: string;
    elementType?: 'button' | 'link' | 'input' | 'custom';
    isPrimary?: boolean;
  }>,
  options?: {
    minimumSpacing?: number;
    containerWidth?: number;
    containerHeight?: number;
  }
) => touchTargetValidator.validateScreen(targets, options);