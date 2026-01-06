/**
 * Animation Library Tests
 *
 * Comprehensive test suite for animation tokens, variants, and hooks.
 * Tests cover token values, variant structure, and hook behavior.
 *
 * @module tests/animations.test
 * @version 1.0.0 (Slice 20 - Animation Library Enhancement)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  // Tokens
  DURATION,
  TIMING,
  EASING,
  SPRING,
  STAGGER,
  DISTANCE,
  SCALE,
  TRANSITIONS,
  prefersReducedMotion,
  getReducedMotionDuration,
  getReducedMotionTransition,
  // Variants
  cardLift,
  cardEnter,
  fade,
  fadeInUp,
  fadeInDown,
  fadeInScale,
  staggerContainer,
  staggerContainerFast,
  staggerContainerSlow,
  listItem,
  gridItem,
  drawerSlide,
  slideInRight,
  slideInLeft,
  verdictReveal,
  successPulse,
  warningPulse,
  shimmer,
  skeletonPulse,
  spinnerRotate,
  numberReveal,
  numberChange,
  buttonPress,
  iconBounce,
  checkMark,
  modalBackdrop,
  modalContent,
  getSpringTransition,
  createSpringTransition,
} from '@/lib/animations';

// =============================================================================
// TOKEN TESTS
// =============================================================================

describe('Animation Tokens', () => {
  describe('DURATION', () => {
    it('should have all required duration values', () => {
      expect(DURATION).toHaveProperty('instant');
      expect(DURATION).toHaveProperty('fast');
      expect(DURATION).toHaveProperty('normal');
      expect(DURATION).toHaveProperty('slow');
      expect(DURATION).toHaveProperty('slower');
    });

    it('should have durations in ascending order', () => {
      expect(DURATION.instant).toBeLessThan(DURATION.fast);
      expect(DURATION.fast).toBeLessThan(DURATION.normal);
      expect(DURATION.normal).toBeLessThan(DURATION.slow);
      expect(DURATION.slow).toBeLessThan(DURATION.slower);
    });

    it('should have durations within reasonable ranges (0.1s - 1s)', () => {
      Object.values(DURATION).forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0.1);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('TIMING should be an alias for DURATION', () => {
      expect(TIMING).toEqual(DURATION);
    });
  });

  describe('EASING', () => {
    it('should have all required easing functions', () => {
      expect(EASING).toHaveProperty('standard');
      expect(EASING).toHaveProperty('decelerate');
      expect(EASING).toHaveProperty('accelerate');
      expect(EASING).toHaveProperty('sharp');
      expect(EASING).toHaveProperty('bounce');
    });

    it('should have legacy aliases', () => {
      expect(EASING).toHaveProperty('snap');
      expect(EASING).toHaveProperty('smooth');
    });

    it('each easing should be a valid cubic-bezier array', () => {
      Object.values(EASING).forEach((curve) => {
        expect(Array.isArray(curve)).toBe(true);
        expect(curve).toHaveLength(4);
        curve.forEach((value) => {
          expect(typeof value).toBe('number');
        });
      });
    });
  });

  describe('SPRING', () => {
    it('should have all required spring configurations', () => {
      expect(SPRING).toHaveProperty('gentle');
      expect(SPRING).toHaveProperty('default');
      expect(SPRING).toHaveProperty('snappy');
      expect(SPRING).toHaveProperty('bouncy');
      expect(SPRING).toHaveProperty('stiff');
    });

    it('each spring should have required physics properties', () => {
      Object.values(SPRING).forEach((spring) => {
        expect(spring).toHaveProperty('type', 'spring');
        expect(spring).toHaveProperty('stiffness');
        expect(spring).toHaveProperty('damping');
        expect(spring).toHaveProperty('mass');
        expect(typeof spring.stiffness).toBe('number');
        expect(typeof spring.damping).toBe('number');
        expect(typeof spring.mass).toBe('number');
      });
    });

    it('stiffness should increase from gentle to stiff', () => {
      expect(SPRING.gentle.stiffness).toBeLessThan(SPRING.default.stiffness);
      expect(SPRING.default.stiffness).toBeLessThan(SPRING.snappy.stiffness);
      expect(SPRING.snappy.stiffness).toBeLessThan(SPRING.stiff.stiffness);
    });
  });

  describe('STAGGER', () => {
    it('should have all required stagger values', () => {
      expect(STAGGER).toHaveProperty('fast');
      expect(STAGGER).toHaveProperty('default');
      expect(STAGGER).toHaveProperty('slow');
      expect(STAGGER).toHaveProperty('slower');
    });

    it('stagger values should be in ascending order', () => {
      expect(STAGGER.fast).toBeLessThan(STAGGER.default);
      expect(STAGGER.default).toBeLessThan(STAGGER.slow);
      expect(STAGGER.slow).toBeLessThan(STAGGER.slower);
    });
  });

  describe('DISTANCE', () => {
    it('should have all required distance values', () => {
      expect(DISTANCE).toHaveProperty('subtle');
      expect(DISTANCE).toHaveProperty('small');
      expect(DISTANCE).toHaveProperty('medium');
      expect(DISTANCE).toHaveProperty('large');
      expect(DISTANCE).toHaveProperty('xlarge');
    });

    it('distances should be in ascending order', () => {
      expect(DISTANCE.subtle).toBeLessThan(DISTANCE.small);
      expect(DISTANCE.small).toBeLessThan(DISTANCE.medium);
      expect(DISTANCE.medium).toBeLessThan(DISTANCE.large);
      expect(DISTANCE.large).toBeLessThan(DISTANCE.xlarge);
    });
  });

  describe('SCALE', () => {
    it('should have all required scale values', () => {
      expect(SCALE).toHaveProperty('pressed');
      expect(SCALE).toHaveProperty('subtle');
      expect(SCALE).toHaveProperty('none');
      expect(SCALE).toHaveProperty('hover');
      expect(SCALE).toHaveProperty('emphasis');
      expect(SCALE).toHaveProperty('pop');
    });

    it('pressed/subtle should be less than 1', () => {
      expect(SCALE.pressed).toBeLessThan(1);
      expect(SCALE.subtle).toBeLessThan(1);
    });

    it('hover/emphasis/pop should be greater than 1', () => {
      expect(SCALE.hover).toBeGreaterThan(1);
      expect(SCALE.emphasis).toBeGreaterThan(1);
      expect(SCALE.pop).toBeGreaterThan(1);
    });

    it('none should equal 1', () => {
      expect(SCALE.none).toBe(1);
    });
  });

  describe('TRANSITIONS', () => {
    it('should have all required transition presets', () => {
      expect(TRANSITIONS).toHaveProperty('instant');
      expect(TRANSITIONS).toHaveProperty('fast');
      expect(TRANSITIONS).toHaveProperty('standard');
      expect(TRANSITIONS).toHaveProperty('enter');
      expect(TRANSITIONS).toHaveProperty('exit');
      expect(TRANSITIONS).toHaveProperty('reveal');
      expect(TRANSITIONS).toHaveProperty('celebrate');
    });

    it('each transition should have duration and ease', () => {
      Object.values(TRANSITIONS).forEach((transition) => {
        expect(transition).toHaveProperty('duration');
        expect(transition).toHaveProperty('ease');
        expect(typeof transition.duration).toBe('number');
        expect(Array.isArray(transition.ease)).toBe(true);
      });
    });
  });
});

// =============================================================================
// REDUCED MOTION TESTS
// =============================================================================

describe('Reduced Motion Utilities', () => {
  describe('prefersReducedMotion', () => {
    let matchMediaSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      matchMediaSpy = vi.spyOn(window, 'matchMedia');
    });

    afterEach(() => {
      matchMediaSpy.mockRestore();
    });

    it('should return false when reduced motion is not preferred', () => {
      matchMediaSpy.mockReturnValue({ matches: false } as MediaQueryList);
      expect(prefersReducedMotion()).toBe(false);
    });

    it('should return true when reduced motion is preferred', () => {
      matchMediaSpy.mockReturnValue({ matches: true } as MediaQueryList);
      expect(prefersReducedMotion()).toBe(true);
    });
  });

  describe('getReducedMotionDuration', () => {
    it('should return 0 when reduced motion is preferred', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
      expect(getReducedMotionDuration(0.5)).toBe(0);
    });

    it('should return original duration when reduced motion is not preferred', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
      expect(getReducedMotionDuration(0.5)).toBe(0.5);
    });
  });

  describe('getReducedMotionTransition', () => {
    it('should return instant transition when reduced motion is preferred', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
      const result = getReducedMotionTransition({ duration: 0.5, ease: EASING.standard });
      expect(result.duration).toBe(0);
    });

    it('should return original transition when reduced motion is not preferred', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
      const original = { duration: 0.5, ease: EASING.standard };
      const result = getReducedMotionTransition(original);
      expect(result).toEqual(original);
    });
  });
});

// =============================================================================
// VARIANT STRUCTURE TESTS
// =============================================================================

describe('Animation Variants', () => {
  describe('Card Variants', () => {
    it('cardLift should have rest, hover, and tap states', () => {
      expect(cardLift).toHaveProperty('rest');
      expect(cardLift).toHaveProperty('hover');
      expect(cardLift).toHaveProperty('tap');
    });

    it('cardEnter should have hidden, visible, and exit states', () => {
      expect(cardEnter).toHaveProperty('hidden');
      expect(cardEnter).toHaveProperty('visible');
      expect(cardEnter).toHaveProperty('exit');
    });
  });

  describe('Fade Variants', () => {
    it('fade should have hidden, visible, and exit states', () => {
      expect(fade).toHaveProperty('hidden');
      expect(fade).toHaveProperty('visible');
      expect(fade).toHaveProperty('exit');
    });

    it('fadeInUp should have hidden, visible, and exit states', () => {
      expect(fadeInUp).toHaveProperty('hidden');
      expect(fadeInUp).toHaveProperty('visible');
      expect(fadeInUp).toHaveProperty('exit');
    });

    it('fadeInDown should have hidden, visible, and exit states', () => {
      expect(fadeInDown).toHaveProperty('hidden');
      expect(fadeInDown).toHaveProperty('visible');
      expect(fadeInDown).toHaveProperty('exit');
    });

    it('fadeInScale should have hidden, visible, and exit states', () => {
      expect(fadeInScale).toHaveProperty('hidden');
      expect(fadeInScale).toHaveProperty('visible');
      expect(fadeInScale).toHaveProperty('exit');
    });
  });

  describe('Stagger Variants', () => {
    it('staggerContainer should have staggerChildren in visible transition', () => {
      const visible = staggerContainer.visible as Record<string, unknown>;
      expect(visible).toHaveProperty('transition');
      const transition = visible.transition as { staggerChildren?: number };
      expect(transition).toHaveProperty('staggerChildren');
    });

    it('staggerContainerFast should have faster staggerChildren', () => {
      const defaultVisible = staggerContainer.visible as Record<string, unknown>;
      const fastVisible = staggerContainerFast.visible as Record<string, unknown>;
      const defaultStagger = (defaultVisible.transition as { staggerChildren: number }).staggerChildren;
      const fastStagger = (fastVisible.transition as { staggerChildren: number }).staggerChildren;
      expect(fastStagger).toBeLessThan(defaultStagger);
    });

    it('staggerContainerSlow should have slower staggerChildren', () => {
      const defaultVisible = staggerContainer.visible as Record<string, unknown>;
      const slowVisible = staggerContainerSlow.visible as Record<string, unknown>;
      const defaultStagger = (defaultVisible.transition as { staggerChildren: number }).staggerChildren;
      const slowStagger = (slowVisible.transition as { staggerChildren: number }).staggerChildren;
      expect(slowStagger).toBeGreaterThan(defaultStagger);
    });
  });

  describe('Drawer & Panel Variants', () => {
    it('drawerSlide should have hidden, visible, and exit states', () => {
      expect(drawerSlide).toHaveProperty('hidden');
      expect(drawerSlide).toHaveProperty('visible');
      expect(drawerSlide).toHaveProperty('exit');
    });

    it('slideInRight should have hidden, visible, and exit states', () => {
      expect(slideInRight).toHaveProperty('hidden');
      expect(slideInRight).toHaveProperty('visible');
      expect(slideInRight).toHaveProperty('exit');
    });

    it('slideInLeft should have hidden, visible, and exit states', () => {
      expect(slideInLeft).toHaveProperty('hidden');
      expect(slideInLeft).toHaveProperty('visible');
      expect(slideInLeft).toHaveProperty('exit');
    });
  });

  describe('Status Variants', () => {
    it('verdictReveal should have hidden and visible states', () => {
      expect(verdictReveal).toHaveProperty('hidden');
      expect(verdictReveal).toHaveProperty('visible');
    });

    it('successPulse should have idle and pulse states', () => {
      expect(successPulse).toHaveProperty('idle');
      expect(successPulse).toHaveProperty('pulse');
    });

    it('warningPulse should have idle and pulse states', () => {
      expect(warningPulse).toHaveProperty('idle');
      expect(warningPulse).toHaveProperty('pulse');
    });
  });

  describe('Loading Variants', () => {
    it('shimmer should have initial and animate states', () => {
      expect(shimmer).toHaveProperty('initial');
      expect(shimmer).toHaveProperty('animate');
    });

    it('skeletonPulse should have animate state', () => {
      expect(skeletonPulse).toHaveProperty('animate');
    });

    it('spinnerRotate should have animate state', () => {
      expect(spinnerRotate).toHaveProperty('animate');
    });
  });

  describe('Micro-interaction Variants', () => {
    it('buttonPress should have rest, hover, and tap states', () => {
      expect(buttonPress).toHaveProperty('rest');
      expect(buttonPress).toHaveProperty('hover');
      expect(buttonPress).toHaveProperty('tap');
    });

    it('iconBounce should have rest, hover, and tap states', () => {
      expect(iconBounce).toHaveProperty('rest');
      expect(iconBounce).toHaveProperty('hover');
      expect(iconBounce).toHaveProperty('tap');
    });

    it('checkMark should have hidden and visible states', () => {
      expect(checkMark).toHaveProperty('hidden');
      expect(checkMark).toHaveProperty('visible');
    });
  });

  describe('Modal Variants', () => {
    it('modalBackdrop should have hidden, visible, and exit states', () => {
      expect(modalBackdrop).toHaveProperty('hidden');
      expect(modalBackdrop).toHaveProperty('visible');
      expect(modalBackdrop).toHaveProperty('exit');
    });

    it('modalContent should have hidden, visible, and exit states', () => {
      expect(modalContent).toHaveProperty('hidden');
      expect(modalContent).toHaveProperty('visible');
      expect(modalContent).toHaveProperty('exit');
    });
  });
});

// =============================================================================
// SPRING HELPER TESTS
// =============================================================================

describe('Spring Helpers', () => {
  describe('getSpringTransition', () => {
    it('should return correct spring configuration for each key', () => {
      const keys: Array<keyof typeof SPRING> = ['gentle', 'default', 'snappy', 'bouncy', 'stiff'];
      keys.forEach((key) => {
        const result = getSpringTransition(key);
        expect(result).toEqual(SPRING[key]);
      });
    });
  });

  describe('createSpringTransition', () => {
    it('should create a custom spring with provided values', () => {
      const result = createSpringTransition(300, 25, 1.2);
      expect(result).toEqual({
        type: 'spring',
        stiffness: 300,
        damping: 25,
        mass: 1.2,
      });
    });

    it('should default mass to 1 if not provided', () => {
      const result = createSpringTransition(200, 20);
      expect(result.mass).toBe(1);
    });
  });
});

// =============================================================================
// GPU ACCELERATION TESTS
// =============================================================================

describe('GPU Acceleration', () => {
  it('card variants should only use GPU-accelerated properties', () => {
    const gpuProperties = ['opacity', 'transform', 'y', 'x', 'scale', 'rotate', 'boxShadow'];

    const checkGpuProperties = (variant: Record<string, unknown>) => {
      Object.entries(variant).forEach(([state, values]) => {
        if (typeof values === 'object' && values !== null) {
          const keys = Object.keys(values).filter((k) => k !== 'transition');
          keys.forEach((key) => {
            const isGpu = gpuProperties.includes(key) || key === 'filter' || key === 'overflow' || key === 'height';
            expect(isGpu).toBe(true);
          });
        }
      });
    };

    checkGpuProperties(cardLift as Record<string, unknown>);
    checkGpuProperties(fadeInUp as Record<string, unknown>);
    checkGpuProperties(buttonPress as Record<string, unknown>);
  });
});
