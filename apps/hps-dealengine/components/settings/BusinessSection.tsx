'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Building2, Upload } from 'lucide-react';
import { SettingsCard } from './SettingsCard';
import { SaveStatus, SaveStatusType } from './SaveStatus';
import { Button } from '@/components/ui';
import {
  getOrganization,
  updateOrganization,
  uploadOrganizationLogo,
  removeOrganizationLogo,
  OrgError,
} from '@/lib/orgSettings';
import {
  MAX_LOGO_SIZE,
  ALLOWED_LOGO_TYPES,
  isAllowedLogoType,
  isValidLogoSize,
  formatFileSize,
} from '@hps-internal/contracts';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/useToast';

interface OrgBusiness {
  name: string;
  logoUrl: string | null;
}

interface BusinessSectionProps {
  orgId: string | null;
  onOrgLoaded?: (orgId: string) => void;
}

/**
 * BusinessSection
 *
 * Manages organization business settings (name, logo).
 * VP-only editing, others view-only.
 *
 * Accessibility:
 * - aria-invalid on inputs with errors
 * - aria-describedby links errors to inputs
 * - Accessible file input with visible label
 * - aria-live for upload progress
 * - WCAG 2.5.5 touch targets (44px)
 */
export function BusinessSection({
  orgId,
  onOrgLoaded,
}: BusinessSectionProps): JSX.Element {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(orgId);
  const [business, setBusiness] = useState<OrgBusiness | null>(null);
  const [businessLoading, setBusinessLoading] = useState(true);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [businessFieldError, setBusinessFieldError] = useState<string | null>(
    null
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatusType>('idle');
  const [logoUploading, setLogoUploading] = useState(false);
  const [canEditBusiness, setCanEditBusiness] = useState(false);

  // Load org data
  useEffect(() => {
    let isMounted = true;

    async function loadOrgData(): Promise<void> {
      try {
        // Get current user's org if not provided
        let orgIdToUse: string | null = currentOrgId;

        if (!orgIdToUse) {
          const supabase = getSupabaseClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            if (isMounted) setBusinessLoading(false);
            return;
          }

          const { data: membership } = await supabase
            .from('memberships')
            .select('org_id')
            .eq('user_id', user.id)
            .limit(1)
            .single();

          if (!membership?.org_id) {
            if (isMounted) setBusinessLoading(false);
            return;
          }

          const resolvedOrgId = membership.org_id;
          orgIdToUse = resolvedOrgId;
          if (isMounted) {
            setCurrentOrgId(resolvedOrgId);
            onOrgLoaded?.(resolvedOrgId);
          }
        }

        // At this point orgIdToUse is guaranteed to be non-null
        if (!orgIdToUse) return;

        // Fetch organization settings
        const orgResponse = await getOrganization(orgIdToUse);
        if (isMounted) {
          setBusiness({
            name: orgResponse.organization.name,
            logoUrl: orgResponse.organization.logo_url || null,
          });
          setCanEditBusiness(orgResponse.caller_role === 'vp');
          setBusinessLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setBusinessError(
            err instanceof OrgError ? err.message : 'Failed to load organization'
          );
          setBusinessLoading(false);
        }
      }
    }

    loadOrgData();

    return () => {
      isMounted = false;
    };
  }, [currentOrgId, onOrgLoaded]);

  // Save business settings
  const onSaveBusiness = useCallback(async (): Promise<void> => {
    if (!business?.name?.trim() || !currentOrgId) {
      setBusinessFieldError('Business name is required');
      return;
    }

    try {
      setSaveStatus('saving');
      setBusinessError(null);
      setBusinessFieldError(null);

      await updateOrganization({
        org_id: currentOrgId,
        name: business.name.trim(),
      });

      setSaveStatus('success');
      toast.success('Business saved', 'Organization settings updated.');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('error');
      if (err instanceof OrgError) {
        if (err.field === 'name') {
          setBusinessFieldError(err.message);
        } else {
          setBusinessError(err.message);
          toast.error('Save failed', err.message);
        }
      } else {
        setBusinessError('An unexpected error occurred. Please try again.');
        toast.error('Save failed', 'An unexpected error occurred.');
      }
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [business, currentOrgId, toast]);

  // Handle logo upload
  const onLogoChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      if (!file || !currentOrgId) return;

      // Validate file type
      if (!isAllowedLogoType(file.type)) {
        setBusinessFieldError(
          `Invalid file type. Allowed: ${ALLOWED_LOGO_TYPES.join(', ')}`
        );
        return;
      }

      // Validate file size
      if (!isValidLogoSize(file.size)) {
        setBusinessFieldError(
          `File too large. Maximum size is ${formatFileSize(MAX_LOGO_SIZE)}.`
        );
        return;
      }

      try {
        setLogoUploading(true);
        setBusinessError(null);
        setBusinessFieldError(null);

        const publicUrl = await uploadOrganizationLogo(currentOrgId, file);

        setBusiness((prev) => (prev ? { ...prev, logoUrl: publicUrl } : null));
        toast.success('Logo uploaded', 'Your organization logo has been updated.');
      } catch (err) {
        if (err instanceof OrgError) {
          setBusinessError(err.message);
          toast.error('Upload failed', err.message);
        } else {
          setBusinessError('Failed to upload logo. Please try again.');
          toast.error('Upload failed', 'Failed to upload logo. Please try again.');
        }
      } finally {
        setLogoUploading(false);
        event.target.value = '';
      }
    },
    [currentOrgId, toast]
  );

  // Handle logo removal
  const onRemoveLogo = useCallback(async (): Promise<void> => {
    if (!currentOrgId) return;

    try {
      setLogoUploading(true);
      setBusinessError(null);

      await removeOrganizationLogo(currentOrgId);

      setBusiness((prev) => (prev ? { ...prev, logoUrl: null } : null));
      toast.success('Logo removed', 'Organization logo has been removed.');
    } catch (err) {
      if (err instanceof OrgError) {
        setBusinessError(err.message);
        toast.error('Remove failed', err.message);
      } else {
        setBusinessError('Failed to remove logo. Please try again.');
        toast.error('Remove failed', 'Failed to remove logo. Please try again.');
      }
    } finally {
      setLogoUploading(false);
    }
  }, [currentOrgId, toast]);

  // Trigger file input click
  const handleUploadClick = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  // Loading state
  if (businessLoading) {
    return (
      <SettingsCard
        title="Business"
        description="Manage your organization's name and logo."
        icon={<Building2 className="h-5 w-5" />}
        data-testid="settings-card-business"
      >
        <div
          className="space-y-3 animate-pulse motion-reduce:animate-none"
          aria-busy="true"
          aria-label="Loading business settings"
        >
          <div className="h-[68px] bg-white/5 rounded-lg" />
          <div className="h-20 bg-white/5 rounded-lg" />
        </div>
      </SettingsCard>
    );
  }

  // Error state
  if (businessError && !business) {
    return (
      <SettingsCard
        title="Business"
        description="Manage your organization's name and logo."
        icon={<Building2 className="h-5 w-5" />}
        data-testid="settings-card-business"
      >
        <div
          className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg"
          role="alert"
        >
          <p className="text-accent-red text-sm">{businessError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-accent-red/80 underline hover:text-accent-red min-h-[44px] inline-flex items-center"
          >
            Retry
          </button>
        </div>
      </SettingsCard>
    );
  }

  const hasNameError = !!businessFieldError;
  const nameErrorId = 'business-name-error';
  const logoDescriptionId = 'logo-upload-description';

  return (
    <SettingsCard
      title="Business"
      description={
        canEditBusiness
          ? "Manage your organization's name and logo."
          : "View your organization's details. Only VP can edit."
      }
      icon={<Building2 className="h-5 w-5" />}
      data-testid="settings-card-business"
      footer={
        canEditBusiness ? (
          <div className="flex items-center gap-3">
            <SaveStatus status={saveStatus} />
            <Button
              size="sm"
              variant="primary"
              onClick={onSaveBusiness}
              disabled={saveStatus === 'saving' || !business?.name?.trim()}
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save Business'}
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {/* Business Name */}
        <div className="space-y-1">
          <label
            htmlFor="business-name"
            className="text-sm font-semibold text-text-primary"
          >
            Business name
          </label>
          <input
            id="business-name"
            type="text"
            value={business?.name || ''}
            onChange={(e) => {
              setBusiness((prev) =>
                prev ? { ...prev, name: e.target.value } : null
              );
              setBusinessFieldError(null);
            }}
            className={`input-base min-h-[44px] ${
              hasNameError
                ? 'border-accent-red/50 focus:ring-accent-red/50'
                : ''
            } ${
              !canEditBusiness
                ? 'bg-white/5 text-text-secondary cursor-not-allowed'
                : ''
            }`}
            placeholder="Your organization name"
            maxLength={100}
            disabled={saveStatus === 'saving' || !canEditBusiness}
            aria-invalid={hasNameError}
            aria-describedby={hasNameError ? nameErrorId : undefined}
          />
          {hasNameError && (
            <p id={nameErrorId} className="text-sm text-accent-red" role="alert">
              {businessFieldError}
            </p>
          )}
        </div>

        {/* Business Logo */}
        <div className="space-y-2">
          <span className="block text-sm font-semibold text-text-primary">
            Business logo
          </span>

          {canEditBusiness && (
            <>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_LOGO_TYPES.join(',')}
                onChange={onLogoChange}
                className="sr-only"
                disabled={logoUploading}
                aria-describedby={logoDescriptionId}
                id="logo-upload"
              />

              {/* Visible upload button */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleUploadClick}
                disabled={logoUploading}
                className="gap-2 min-h-[44px]"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                {logoUploading ? 'Uploading...' : 'Upload Logo'}
              </Button>

              <p id={logoDescriptionId} className="text-xs text-text-secondary">
                {`Max ${formatFileSize(MAX_LOGO_SIZE)}. ${ALLOWED_LOGO_TYPES.join(', ')}`}
              </p>
            </>
          )}

          {/* Upload status announcement */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {logoUploading && 'Uploading logo...'}
          </div>

          {business?.logoUrl ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={business.logoUrl}
                alt="Business logo"
                className="h-12 w-auto max-w-[150px] object-contain rounded border border-white/10"
                loading="lazy"
              />
              {canEditBusiness && (
                <button
                  type="button"
                  onClick={onRemoveLogo}
                  disabled={logoUploading}
                  className="min-h-[44px] px-3 text-xs font-semibold text-accent-orange hover:text-accent-red disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-text-secondary">
              {canEditBusiness ? 'No logo uploaded.' : 'No logo uploaded.'}
            </p>
          )}
        </div>
      </div>
    </SettingsCard>
  );
}
