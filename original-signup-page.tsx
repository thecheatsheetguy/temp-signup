/* eslint-disable local-rules/require-d-ts */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Meteor } from 'meteor/meteor/client';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useCallback, useEffect, useState } from 'react';
import _ from 'underscore';

import { checkFeatureToDiscover, signupQueryParams } from '/client/login-helpers';
import type { PostLoginContext } from '/client/react/login/@types/login.d.ts';
import OAuthButtons from '/client/react/login/oauth-buttons.tsx';
import PrivacyPolicy from '/client/react/login/privacy-policy.tsx';
import InboxesButtons from '/client/react/login-helpers/inboxes-buttons.tsx';
import SignupOnboarding from '/lemlist/onboarding/client/signup-onboarding.tsx';
import { nameRegExp } from '/lib/helpers';
import { i18nCurrentLanguage } from '/lib/lempire/lempire-i18n';
import products from '/modules/billing-next/client/products';
import _rudderanalytics from '/modules/rudderstack/client/rudderstack';
import UiEdit from '/modules/ui/client/react/ui-edit.jsx';
import UiInfoMsg from '/modules/ui/client/react/ui-info-msg.jsx';

type SignUpState = 'form' | 'emailVerification' | 'onboarding' | 'inviteTeammates';
type SignUpParams = Record<string, unknown> & { discoverFeature?: string };

const SignUp = (): React.ReactNode => {
  // If already logged in (direct navigation to /create-account), start at onboarding
  const [state, setState] = useState<SignUpState>(Meteor.userId() ? 'onboarding' : 'form');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupClicked, setSignupClicked] = useState(false);
  const [passwordChecks, setPasswordChecks] = useState({
    lower: false,
    upper: false,
    number: false,
    special: false,
    length: false,
  });
  const [oAuthError, setOAuthError] = useState<string | undefined>();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [signupType, setSignupType] = useState<'password' | 'oauth'>('password');
  const [teamId, setTeamId] = useState<string | undefined>();

  useEffect(() => {
    checkFeatureToDiscover();
    if (FlowRouter.getQueryParam('ps_xid')) {
      const affiliation = {
        partnerStackId: FlowRouter.getQueryParam('ps_xid'),
        partnerStackOriginalId: FlowRouter.getQueryParam('ps_partner_key'),
        partnerStackCustomId: FlowRouter.getQueryParam('utm_campaign'),
        expiredAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
      };
      localStorage.setItem('affiliation', JSON.stringify(affiliation));
    }
    const prefillEmail = FlowRouter.getQueryParam('email');
    if (prefillEmail) setEmail(prefillEmail);

    // Google test key (always passes) — production overrides via Meteor.settings.public.recaptchaSiteKey
    const recaptchaSiteKey =
      Meteor.settings.public.recaptchaSiteKey || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
    window.recaptchaCallback = (): void => {
      window.grecaptcha?.render('recaptcha', { sitekey: recaptchaSiteKey });
    };
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=recaptchaCallback&render=explicit';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  const onLoginSuccess = useCallback(
    async (params: SignUpParams) => {
      const productName = currentProduct();
      const productsWithSignupHook = products as typeof products & {
        onUserCreated: (createdProductName: string, signupParams: SignUpParams) => void;
      };

      // Post-signup setup
      refreshTimeZone();
      productsWithSignupHook.onUserCreated(productName, params);

      if (productName === 'lemlist') {
        lp.callAsync('usersOnboardingStartInviteFlow').catch(() => undefined);
      }

      window.gtagEvent?.({ event: `${productName}-signup` });

      lp.callAsync('customerIoUpdateAttributes', {
        first_name: firstName,
        last_name: lastName,
      }).catch(() => undefined);

      lp.callAsync('trackNewUser', params).catch(() => undefined);

      // Check server for email verification status
      const context: PostLoginContext = await lp.callAsync('getPostLoginContext');

      _rudderanalytics.track('sign_up_lemapp', {
        userId: Meteor.userId()!,
        teamId: context.teamId,
        productName,
        ...params,
      });
      setTeamId(context.teamId);

      const requireVerification = Meteor.settings.public?.requireEmailVerification !== false;

      if (!context.emailVerified && requireVerification) {
        setUserEmail(email);
        setState('emailVerification');
        return;
      }

      setState('onboarding');
    },
    [email, firstName, lastName]
  );

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    setPasswordChecks({
      lower: /[a-z]/.test(value),
      upper: /[A-Z]/.test(value),
      number: /[0-9]/.test(value),
      special: /[^a-zA-Z0-9]/.test(value),
      length: value.length >= 8,
    });
  }, []);

  const handleOAuthSuccess = useCallback(
    (type: string, provider: string) => {
      setOAuthError(undefined);
      const oAuthMethod =
        provider === 'google' ? Meteor.oAuthLoginWithGoogle : Meteor.oAuthLoginWithMicrosoft;

      oAuthMethod(
        { productName: currentProduct(), loginType: type },
        (err: { error: string; reason?: string } | undefined) => {
          if (err) {
            if (['user-not-found', 'user-already-exist'].includes(err.error)) {
              setOAuthError(err.reason);
              return;
            }
            if (err.error === 'password-attempt-blocked') {
              FlowRouter.go('/login?too-many-attempts=true');
              return;
            }
            lp.notif.error(err.reason || _t('Connection failed'));
            return;
          }
          const params = signupQueryParams() as any;
          params.type = provider;
          setSignupType('oauth');
          onLoginSuccess(params);
        }
      );
    },
    [onLoginSuccess]
  );

  const handleSignUp = useCallback(async () => {
    if (signupClicked) return;

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    const invalidFirst = _.uniq(trimmedFirst.match(nameRegExp) || []);
    if (invalidFirst?.length) {
      lp.notif.error(
        _t('This special character {0} is not allowed in your first name', invalidFirst.toString())
      );
      return;
    }
    const invalidLast = _.uniq(trimmedLast.match(nameRegExp) || []);
    if (invalidLast?.length) {
      lp.notif.error(
        _t('This special character {0} is not allowed in your last name', invalidLast.toString())
      );
      return;
    }
    if (!trimmedFirst) {
      lp.notif.error(_t('Enter first name to continue.'));
      return;
    }
    if (!trimmedLast) {
      lp.notif.error(_t('Enter last name to continue.'));
      return;
    }

    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail) {
      lp.notif.error(_t('Enter email address to continue.'));
      return;
    }
    if (!password) {
      lp.notif.error(_t('Enter your password to continue.'));
      return;
    }
    if (password.length < 8) {
      lp.notif.error(_t('Your password must have at least 8 characters'));
      return;
    }
    if (password.length >= 128) {
      lp.notif.error(_t('Your password must be less than 128 characters'));
      return;
    }

    if (password.length < 10 && password.replace(/[a-z]/gm, '').length < 3) {
      lp.notif.error(
        _t(
          'Your password must have at least 8 characters and contain at least one uppercase letter, one lowercase letter, one special character and one number.'
        )
      );
      return;
    }

    const options: Record<string, unknown> = {
      login: true,
      profile: { firstName: trimmedFirst, lastName: trimmedLast },
      email: trimmedEmail,
      password,
      productName: currentProduct(),
      language: i18nCurrentLanguage(),
      colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    };

    options.captcha = window.grecaptcha?.getResponse();

    const signupParams = signupQueryParams() as any;
    signupParams.type = 'password';

    if (signupParams.partnerStackId) {
      options.affiliations = {
        source: 'partnerStack',
        id: signupParams.partnerStackId,
        originalId: signupParams.partnerStackOriginalId,
        customId: signupParams.partnerStackCustomId,
      };
    }
    if (signupParams.invitation) {
      options.invitation = signupParams.invitation;
    }

    setSignupClicked(true);

    Meteor.call(
      'registerUser',
      options,
      (err: { reason?: string } | undefined, updated: Record<string, unknown>) => {
        window.localStorage.setItem('colorScheme', options.colorScheme as string);
        if (err) {
          lp.notif.error(err.reason || _t('An error occurred'));
          setSignupClicked(false);
          window.grecaptcha?.reset();
          return;
        }
        const updatedOptions = { ...options, ...updated };
        Meteor.loginWithPassword(
          updatedOptions.email as string,
          updatedOptions.password as string,
          (loginErr: Meteor.Error | Error | undefined) => {
            if (loginErr) {
              const meteorErr = loginErr as Meteor.Error;
              const errorMsg = ['user-forbidden', 'STUDENT_PLAN_MAX_TEAMS_REACHED'].includes(
                (meteorErr.error as string) || ''
              )
                ? meteorErr.reason
                : _t('Incorrect login. Please verify your email and password and retry.');
              lp.notif.error(errorMsg || _t('An error occurred'));
              setSignupClicked(false);
              return;
            }
            onLoginSuccess(signupParams);
          }
        );
      }
    );
  }, [firstName, lastName, email, password, signupClicked, onLoginSuccess]);

  const handleResendVerification = useCallback(() => {
    lp.callAndNotify(
      'sendVerificationEmail',
      _t('Copy that! Email verification sent. You can check your mailbox.')
    );
  }, []);

  const handlePasswordKeyUp = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSignUp();
    },
    [handleSignUp]
  );

  // Watch email verification via DDP subscription — transitions to onboarding when verified
  // TODO: replace with SSE when Meteor is removed
  const emailVerified = useTracker(
    () => Meteor.user({ fields: { 'emails.verified': 1 } })?.emails?.[0]?.verified,
    []
  );

  useEffect(() => {
    if (state === 'emailVerification' && emailVerified) setState('onboarding');
  }, [state, emailVerified]);

  if (state === 'emailVerification') {
    return (
      <div className="ui-col email-verification-form">
        <div className="ui-col sm">
          <div className="ui-row justify-center">
            <h4 className="bold">{_t('Check your email')}</h4>
          </div>
          <div className="ui-row justify-center">
            <div className="ui-col no-gap">
              <div className="ui-row justify-center text-light">
                {_t('We sent you a temporary login link.')}
              </div>
              <div className="ui-row justify-center text-light">
                {_t('Please check your inbox at')}
              </div>
            </div>
          </div>
          <div className="ui-row justify-center">
            <div className="bold">{userEmail}</div>
          </div>
        </div>
        <div className="ui-row spacer" />
        <InboxesButtons />
        <div className="ui-row sm invite-btn-container justify-center">
          <div className="ui-row invite-btn-container align-center">
            {_t("Didn't receive the email?")}
            <button
              className="btn btn-tertiary alt"
              data-testid="resend-verification-email"
              onClick={handleResendVerification}
            >
              {_t('Resend email')}
            </button>
          </div>
        </div>
        <hr />
        <div className="ui-row justify-center">
          <button
            className="btn btn-primary"
            data-testid="logout"
            onClick={(): void => lp.logout()}
          >
            {_t('Back to login')}
          </button>
        </div>
      </div>
    );
  }

  if (state === 'onboarding') {
    return (
      <SignupOnboarding
        initialStep={signupType === 'oauth' ? 'referral' : 'jobTitle'}
        teamId={teamId}
      />
    );
  }

  // Default: registration form
  return (
    <>
      {oAuthError && <UiInfoMsg type="error" content={oAuthError} />}

      <OAuthButtons type="signup" onOAuthSuccess={handleOAuthSuccess} />

      <div className="ui-row">
        <UiEdit
          label={_t('First name')}
          type="text"
          className="flex-1"
          dataTestid="first-name"
          autoComplete="given-name"
          placeholder={_t('Your first name')}
          onChange={(v: string): void => setFirstName(v)}
        />
        <UiEdit
          label={_t('Last name')}
          type="text"
          className="flex-1"
          dataTestid="last-name"
          autoComplete="family-name"
          placeholder={_t('Your last name')}
          onChange={(v: string): void => setLastName(v)}
        />
      </div>

      <UiEdit
        label={_t('Work email')}
        type="email"
        dataTestid="signup-email"
        autoComplete="email"
        placeholder={_t('Work email')}
        value={email}
        onChange={(v: string): void => setEmail(v)}
      />

      <div className="ui-col xs password-wrapper">
        <UiEdit
          label={_t('Password')}
          type="password"
          dataTestid="signup-password"
          autoComplete="new-password"
          onChange={handlePasswordChange}
          onKeyUp={handlePasswordKeyUp}
        />
        <div className="ui-row small wrap justify-center password-checker">
          <div className={`rule upper ${passwordChecks.upper ? 'valid' : ''}`}>
            {_t('Uppercase')}
          </div>
          <div className={`rule lower ${passwordChecks.lower ? 'valid' : ''}`}>
            {_t('Lowercase')}
          </div>
          <div className={`rule number ${passwordChecks.number ? 'valid' : ''}`}>
            {_t('Number')}
          </div>
          <div className={`rule special ${passwordChecks.special ? 'valid' : ''}`}>
            {_t('Symbol')}
          </div>
          <div className={`rule length ${passwordChecks.length ? 'valid' : ''}`}>
            {_t('Min. 8 char.')}
          </div>
        </div>
      </div>

      <div id="recaptcha" className="g-recaptcha cursor-pointer" />

      <button
        className="btn btn-primary lg"
        data-testid="signup-button"
        disabled={signupClicked}
        onClick={handleSignUp}
      >
        {signupClicked && <i className="fal fa-sync fa-spin" aria-hidden="true" />}
        <span>{_t('Create account')}</span>
      </button>

      <div className="ui-col text-align-center">
        <div>
          <span>{_t('Already have an account?')}</span>
          <a
            className="btn btn-link"
            data-testid="signin-link"
            onClick={(): void => FlowRouter.go('/login', {}, FlowRouter.current().queryParams)}
          >
            <span>{_t('Log in')}</span>
          </a>
        </div>
        <PrivacyPolicy />
      </div>
    </>
  );
};

export default SignUp;
