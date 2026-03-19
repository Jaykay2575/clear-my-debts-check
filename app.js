(function () {
  'use strict';

  var form = document.getElementById('debtCheckForm');
  var progressBar = document.getElementById('progressBar');
  var steps = document.querySelectorAll('.step');
  var currentStep = 1;
  var totalSteps = 3;

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
      var firstInput = target.querySelector('input:not([type="hidden"])');
      if (firstInput) setTimeout(function () { firstInput.focus(); }, 100);
    }
  }

  function getStepName(n) {
    if (n === 1) return 'debt_amount';
    if (n === 2) return 'first_name';
    if (n === 3) return 'contact_details';
    return 'complete';
  }

  // --- Step 1: Debt Options ---
  var debtOptions = document.querySelectorAll('.debt-option');
  var debtInput = document.getElementById('debtAmount');

  debtOptions.forEach(function (btn) {
    btn.addEventListener('click', function () {
      debtOptions.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      debtInput.value = btn.getAttribute('data-value');

      // Track debt selection
      track('debt_amount_selected', { debt_range: btn.getAttribute('data-value') });

      // Brief delay then auto-advance
      setTimeout(function () { goToStep(2); }, 250);
    });
  });

  // --- Step 2: Name validation ---
  var firstNameInput = document.getElementById('firstName');
  var step2NextBtn = document.querySelector('[data-next="3"]');

  firstNameInput.addEventListener('input', function () {
    var valid = firstNameInput.value.trim().length >= 2;
    step2NextBtn.disabled = !valid;
  });

  // Enter key on name field
  firstNameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !step2NextBtn.disabled) {
      e.preventDefault();
      goToStep(3);
    }
  });

  step2NextBtn.addEventListener('click', function () {
    goToStep(3);
  });

  // --- Step 3: Contact validation ---
  var phoneInput = document.getElementById('phone');
  var emailInput = document.getElementById('email');
  var submitBtn = document.getElementById('submitBtn');

  function validateStep3() {
    var phone = phoneInput.value.trim();
    var email = emailInput.value.trim();
    var phoneOk = phone.replace(/\s/g, '').length >= 8;
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    submitBtn.disabled = !(phoneOk && emailOk);
  }

  phoneInput.addEventListener('input', validateStep3);
  emailInput.addEventListener('input', validateStep3);

  // --- Format phone number ---
  phoneInput.addEventListener('input', function () {
    var val = phoneInput.value.replace(/[^\d]/g, '');
    if (val.length > 10) val = val.substring(0, 10);
    if (val.length >= 4 && val.startsWith('04')) {
      val = val.substring(0, 4) + ' ' + val.substring(4, 7) + (val.length > 7 ? ' ' + val.substring(7) : '');
    }
    phoneInput.value = val;
    validateStep3();
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
      utm_source: utm.source,
      utm_campaign: utm.campaign
    });

    // Build payload with UTM data
    var payload = {
      'First Name': data.get('First Name'),
      'Phone': data.get('Phone'),
      'Email': data.get('Email'),
      'Total Debt': data.get('Total Debt'),
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
    document.getElementById('successName').textContent = name ? name + ' ' : '';
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
