// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0

interface WebGpuAdapterLike {
  features?: Iterable<unknown>;
  limits?: object;
}

interface WebGpuNavigator extends Navigator {
  gpu?: {
    requestAdapter(options?: {
      powerPreference?: "low-power" | "high-performance";
    }): Promise<WebGpuAdapterLike | null>;
  };
}

export interface WebGpuProbeResult {
  supported: boolean;
  adapterAcquired: boolean;
  featureCount: number;
  limitCount: number;
  reason: string;
  observedAt: string;
}

/**
 * Browser-only hardware preflight. This intentionally stops before loading an
 * upstream kernel or requesting a device; it proves transport capability, not
 * correctness, performance, licensing, or production readiness.
 */
export async function probeWebGpu(): Promise<WebGpuProbeResult> {
  const observedAt = new Date().toISOString();
  if (typeof navigator === "undefined") {
    return {
      supported: false,
      adapterAcquired: false,
      featureCount: 0,
      limitCount: 0,
      reason: "browser navigator is unavailable",
      observedAt,
    };
  }

  const gpu = (navigator as WebGpuNavigator).gpu;
  if (!gpu) {
    return {
      supported: false,
      adapterAcquired: false,
      featureCount: 0,
      limitCount: 0,
      reason: "WebGPU is unavailable in this browser context",
      observedAt,
    };
  }

  try {
    const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) {
      return {
        supported: true,
        adapterAcquired: false,
        featureCount: 0,
        limitCount: 0,
        reason: "WebGPU exists, but no compatible adapter was returned",
        observedAt,
      };
    }

    return {
      supported: true,
      adapterAcquired: true,
      featureCount: adapter.features ? Array.from(adapter.features).length : 0,
      limitCount: adapter.limits ? Object.keys(adapter.limits).length : 0,
      reason: "WebGPU adapter acquired; kernel correctness and performance remain unevaluated",
      observedAt,
    };
  } catch (error) {
    return {
      supported: true,
      adapterAcquired: false,
      featureCount: 0,
      limitCount: 0,
      reason: `WebGPU adapter request failed: ${error instanceof Error ? error.message : String(error)}`,
      observedAt,
    };
  }
}
