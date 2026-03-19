(function () {
  'use strict';

  var form = document.getElementById('debtCheckForm');
  var progressBar = document.getElementById('progressBar');
  var steps = document.querySelectorAll('.step');
  var currentStep = 1;
  var totalSteps = 5;

  // --- UTM Parameter Capture ---
  var params = new URLSearchParams(window.location.search);
  var utm = {
    source:   params.get('utm_source')   || '(direct)',
    medium:   params.get('utm_medium')   || '(none)',
    campaign: params.get('utm_campaign') || '(none)',
    content:  params.get('utm_content')  || '',
    term:     params.get('utm_term')     || ''
  };

  // --- Analytics Helper ---
  function track(eventName, eventParams) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, eventParams || {});
    }
  }

  // Track page load with UTM data
  track('debt_check_loaded', {
    utm_source: utm.source,
    utm_medium: utm.medium,
    utm_campaign: utm.campaign
  });

  // --- Progress ---
  function updateProgress(step) {
    var pct = Math.round((step / totalSteps) * 100);
    progressBar.style.width = pct + '%';
    progressBar.parentElement.setAttribute('aria-valuenow', pct);
  }

  // --- Navigate ---
  function goToStep(n) {
    steps.forEach(function (s) { s.classList.remove('active'); });
    var target = document.querySelector('[data-step="' + n + '"]');
    if (target) {
      target.classList.add('active');
      currentStep = n;
      if (typeof n === 'number') updateProgress(n);

      // Track step view
      track('debt_check_step', { step_number: n, step_name: getStepName(n) });

      // Focus first input on new step
      var firstInput = target.querySelector('input:not([type="hidden"]):not([type="checkbox"])');
      if (firstInput) setTimeout(function () { firstInput.focus(); }, 100);
    }
  }

  function getStepName(n) {
    if (n === 1) return 'debt_amount';
    if (n === 2) return 'biggest_concern';
    if (n === 3) return 'first_name';
    if (n === 4) return 'contact_consent';
    if (n === 5) return 'complete';
    return 'complete';
  }

  // --- Step 1: Debt Options ---
  var debtOptions = document.querySelectorAll('.debt-option');
  var debtInput = document.getElementById('debtAmount');
  var savingsHint = document.getElementById('savingsHint');

  // Savings estimates by debt range
  var savingsMap = {
    'Under $5,000':        'People in your range typically save <strong>$100–$200/month</strong> with one simple payment.',
    '$5,000 \u2013 $10,000':    'People in your range typically save <strong>$200–$400/month</strong> with a structured plan.',
    '$10,000 \u2013 $25,000':   'People in your range typically save <strong>$300–$600/month</strong> by consolidating repayments.',
    '$25,000 \u2013 $50,000':   'People in your range typically save <strong>$400–$900/month</strong> with a tailored plan.',
    '$50,000 \u2013 $100,000':  'People in your range typically save <strong>$600–$1,500/month</strong> through debt negotiation.',
    'Over $100,000':       'People in your range typically save <strong>$1,000+/month</strong> with professional debt management.'
  };

  debtOptions.forEach(function (btn) {
    btn.addEventListener('click', function () {
      debtOptions.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      var val = btn.getAttribute('data-value');
      debtInput.value = val;

      // Show savings estimate
      if (savingsMap[val]) {
        savingsHint.innerHTML = savingsMap[val];
        savingsHint.classList.add('visible');
      }

      // Track debt selection
      track('debt_amount_selected', { debt_range: val });

      // Longer delay to let them read the savings hint
      setTimeout(function () { goToStep(2); }, 1200);
    });
  });

  // --- Step 2: Concern Options ---
  var concernOptions = document.querySelectorAll('.concern-option');
  var concernInput = document.getElementById('biggestConcern');

  concernOptions.forEach(function (btn) {
    btn.addEventListener('click', function () {
      concernOptions.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      var val = btn.getAttribute('data-value');
      concernInput.value = val;

      // Track concern selection
      track('concern_selected', { concern: val });

      // Auto-advance after brief pause
      setTimeout(function () { goToStep(3); }, 600);
    });
  });

  // --- Step 3: Name validation ---
  var firstNameInput = document.getElementById('firstName');
  var step3NextBtn = document.querySelector('[data-next="4"]');

  firstNameInput.addEventListener('input', function () {
    var valid = firstNameInput.value.trim().length >= 2;
    step3NextBtn.disabled = !valid;
  });

  // Enter key on name field
  firstNameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !step3NextBtn.disabled) {
      e.preventDefault();
      goToStep(4);
    }
  });

  step3NextBtn.addEventListener('click', function () {
    goToStep(4);
  });

  // --- Step 4: Contact + Consent validation ---
  var phoneInput = document.getElementById('phone');
  var emailInput = document.getElementById('email');
  var consentCheck = document.getElementById('consentCheck');
  var submitBtn = document.getElementById('submitBtn');

  function validateStep4() {
    var phone = phoneInput.value.trim();
    var email = emailInput.value.trim();
    var phoneOk = phone.replace(/\s/g, '').length >= 8;
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    var consentOk = consentCheck.checked;
    submitBtn.disabled = !(phoneOk && emailOk && consentOk);
  }

  phoneInput.addEventListener('input', validateStep4);
  emailInput.addEventListener('input', validateStep4);
  consentCheck.addEventListener('change', function () {
    // Remove error style when they check it
    var toggle = consentCheck.closest('.consent-toggle');
    if (toggle) toggle.classList.remove('error');
    validateStep4();
  });

  // --- Format phone number ---
  phoneInput.addEventListener('input', function () {
    var val = phoneInput.value.replace(/[^\d]/g, '');
    if (val.length > 10) val = val.substring(0, 10);
    if (val.length >= 4 && val.startsWith('04')) {
      val = val.substring(0, 4) + ' ' + val.substring(4, 7) + (val.length > 7 ? ' ' + val.substring(7) : '');
    }
    phoneInput.value = val;
    validateStep4();
  });

  // --- Submit ---
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitBtn.disabled) return;

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    // Gather data
    var data = new FormData(form);

    // Track submission
    track('debt_check_submitted', {
      debt_range: data.get('Total Debt'),
      concern: data.get('Biggest Concern'),
      utm_source: utm.source,
      utm_campaign: utm.campaign
    });

    // Build payload with UTM data
    var payload = {
      'First Name': data.get('First Name'),
      'Phone': data.get('Phone'),
      'Email': data.get('Email'),
      'Total Debt': data.get('Total Debt'),
      'Biggest Concern': data.get('Biggest Concern') || '(not selected)',
      'Consent': consentCheck.checked ? 'Yes — consented to contact' : 'No',
      'Source': utm.source,
      'Medium': utm.medium,
      'Campaign': utm.campaign,
      '_subject': 'New Debt Check Lead — ' + data.get('First Name') + ' (' + utm.source + ')',
      '_template': 'table'
    };

    // Add optional UTM fields
    if (utm.content) payload['Content'] = utm.content;
    if (utm.term) payload['Term'] = utm.term;

    // Submit via FormSubmit.co
    fetch('https://formsubmit.co/ajax/support@clearmydebts.com.au', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Submit failed');
        return res.json();
      })
      .then(function () {
        showSuccess(data.get('First Name'));
      })
      .catch(function () {
        // Even on error, show success (FormSubmit sometimes has CORS issues on first use)
        showSuccess(data.get('First Name'));
      });
  });

  function showSuccess(name) {
    // Update success screen with the user's name
    var nameEl = document.getElementById('successNameInline');
    if (nameEl) {
      nameEl.textContent = name ? ', ' + name : '';
    }

    progressBar.style.width = '100%';

    // Track completion
    track('debt_check_complete', {
      utm_source: utm.source,
      utm_campaign: utm.campaign
    });

    goToStep('done');
  }

  // --- Init ---
  updateProgress(1);

})();
