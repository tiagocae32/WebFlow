//if (window.location.pathname === '/aanmelden') {
class FormManager {
  constructor(steps) {
    this.steps = steps;
    this.currentStepIndex = 0;
    this.formData = {};
    this.citiesList = [];
    this.initEnums();
    this.initStepRules();
    this.initElements();
    this.sideEffects = false;
    this.cities = [];
    this.citiesNameSelected = [];
    this.cbr_locations = [];
    this.stepHistory = [];
    this.initBirthDateInput();
    this.initFormInputEvents();
    this.urls = {
      payment_link:
        "https://api.develop.nutheorie.be/api/applications/payment_link/",
      package_start:
        "https://api.develop.nutheorie.be/api/applications/set_package_start/",
      final_redirect_url: "https://develop.nutheorie.be/user-profile",
      fail_redirect_url: "https://develop.nutheorie.be/betaling/failed",
      cities: "https://api.develop.nutheorie.be/api/cities/",
      cbrsLocations:
        "https://api.develop.nutheorie.be/api/applications/exam_locations/",
      plans: "https://api.develop.nutheorie.be/api/applications/online_plans/",
      urlPostMultiStepForm:
        "https://api.develop.nutheorie.be/api/applications/",
    };
    this.dutchMonths = [
      "Januari",
      "Februari",
      "Maart",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Augustus",
      "September",
      "Oktober",
      "November",
      "December",
    ];
    this.resumeConfig = {
      license_type: {
        elementId: "licenseText",
        textMap: {
          motor: "Motortheorie",
          auto: "Autotheorie",
          scooter: "Scootertheorie",
        },
      },
      course_type: {
        elementId: "courseTypeText",
        textMap: {
          online: ` Volledige online cursus
  
                                        Videocursus
                                        CBR oefenexamens
                                        E-book `,
          offline: "Dagcursus met aansluitend het examen: 99,-",
        },
      },
      exam_type: {
        elementId: "examTypeText",
        textMap: {
          1: "Standaard CBR examen (30 min): 48,-",
          2: "Verlengd CBR examen (45 min): 61,-",
          3: "Ik heb zelf al een examen gereserveerd",
        },
      },
      cities: {
        elementId: "citiesText",
        customHandler: this.completeCities,
      },
      cbr_locations: {
        elementId: "cbrLocationsText",
        customHandler: this.completeCbrLocations,
      },
      course_category: {
        elementId: null,
        customHandler: this.completeCourseCategory,
      },
      course_dates: {
        elementId: "specifiekeDates",
        customHandler: this.completeCourseDates,
      },
      course_names: {
        elementId: null,
        customHandler: this.completeCourseNames,
      },
      package_name: {
        elementId: "overzichtRight",
        customHandler: this.completePackage,
      },
    };
    this.resumeConfigInputs = {
      first_name: { elementId: "firstNameText" },
      last_name: { elementId: "lastNameText" },
      nickname: { elementId: "nicknameText" },
      birth_date: { elementId: "birthDateText" },
      email: { elementId: "emailText" },
      phone: { elementId: "phoneText" },
      address_1: { elementId: "address1Text" },
      address_2: { elementId: "address2Text" },
      address_3: { elementId: "address3Text" },
    };
    this.loaderContainer = document.getElementById("loader");
    this.loaderFetch = false;
  }

  initStepRules() {
    this.sectionRules = {
      license_type: {
        auto: "step2",
        motor: "step2",
        scooter: "step2",
      },
      course_type: {
        offline: "step3",
        online: "step3",
      },
      exam_type: {
        offline: {
          1: "step4Cities",
          2: "step4Cities",
          3: "step4Mijn",
        },
        online: {
          1: "step4Cbr",
          2: "step4Cbr",
          3: "step4Mijn",
        },
        common: "step4Mijn",
      },
      course_category: {
        per_dates: "step6",
        per_month: "stepMonths",
        calendar: "stepCalendar",
      },
    };
    this.nextStepRules = {
      step4Cities: "step5",
      step4Cbr: "step5",
      step4Mijn: {
        offline: "stepInputs",
        online: "stepOnlinePackage",
      },
      step5: {
        common: "stepInputs",
      },
      step6: {
        offline: "stepInputs",
        online: "stepOnlinePackage",
      },
      stepMonths: {
        offline: "stepInputs",
        online: "stepOnlinePackage",
      },
      stepCalendar: {
        offline: "stepInputs",
        online: "stepOnlinePackage",
      },
      stepInputs: "overzicht",
    };
    this.submissionRules = {
      course_type: {
        offline: ["cbr_locations"],
        online: ["cities"],
      },
      course_category: {
        per_dates: ["course_dates"],
        per_month: ["course_dates"],
        calendar: ["course_names"],
      },
    };
  }

  initEnums() {
    this.LicenseTypesEnum = Object.freeze({
      AUTO: "auto",
      SCOOTER: "scooter",
      MOTOR: "motor",
    });

    this.PRODUCTS_LIST = {
      BTH: "bth", //auto
      BTH_VE: "bth_ve", //auto
      ATH: "ath", //motor
      ATH_VE: "ath_ve", //motor
      AMTH: "amth", //scooter
      AMTH_VE: "amth_ve", //scooter
      MIJN: "mijn",
    };
  }

  initElements() {
    this.nextButton = document.getElementById("btn-next");
    this.nextButtonText = document.getElementById("btnText");
    this.prevButton = document.getElementById("btn-prev");
    this.nextButton.addEventListener("click", () => this.nextStep());
    this.prevButton.addEventListener("click", () => this.prevStep());
    document.addEventListener("click", (event) => this.handleFormClick(event));
    document.addEventListener("input", (event) => this.handleFormInput(event));
  }

  //INITIALIZE
  initialize() {
    this.updateStepIndexText();
    this.setInitialLicenseTypeFromURL();
    this.setInitialLicenseTypeUI();
    this.setInitialCourseTypeFromURL();
    this.setInitialCourseTypeUI();
    this.stepHistory.push(this.steps[this.currentStepIndex].id);
    this.showFormForStep(this.currentStepIndex);
  }

  // HELPERS

  convertDate() {
    const change = this.convertDateToISO(this.formData["birth_date"]);
    this.formData["birth_date"] = change;
  }

  convertDateToISO(dateString) {
    const parts = dateString.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
  }

  //URL

  getURLParameter(paramName) {
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get(paramName);
  }

  setInitialLicenseTypeFromURL() {
    const licenseType = this.getURLParameter("license_type");
    if (licenseType) {
      this.formData["license_type"] = licenseType;
      this.stepHistory.push(this.steps[0].id, this.steps[1].id);
      this.currentStepIndex = 1;
    }
  }

  setInitialLicenseTypeUI() {
    const licenseType = this.formData["license_type"];
    if (licenseType) {
      const licenseTypeElements = document.querySelectorAll(
        "[data-license-type]"
      );
      licenseTypeElements.forEach((element) => {
        if (element.getAttribute("data-license-type") === licenseType) {
          element.classList.add("selected-course");
        } else {
          element.classList.remove("selected-course");
        }
      });
    }
  }

  setInitialCourseTypeFromURL() {
    const courseType = this.getURLParameter("course_type");
    if (courseType) {
      this.formData["course_type"] = courseType;
      if (this.formData["license_type"]) {
        this.stepHistory.push(this.steps[2].id);
        this.currentStepIndex = 2;
      }
    }
  }

  setInitialCourseTypeUI() {
    const courseType = this.formData["course_type"];
    if (courseType) {
      const courseTypeElements =
        document.querySelectorAll("[data-course-type]");

      courseTypeElements.forEach((element) => {
        if (element.getAttribute("data-course-type") === courseType) {
          element.classList.add("selected-course");
        } else {
          element.classList.remove("selected-course");
        }
      });
    }
  }
  // END URL

  // NEXT/PREV STEP

  redirectTo(url) {
    window.location.href = url;
  }

  nextStep() {
    const currentStepId = this.getCurrentStepId();
    const nextStepId = this.getNextStepId(currentStepId);

    if (currentStepId === "overzicht") {
      this.handleFinalStep();
      return;
    }

    const nextStepIndex = this.steps.findIndex(
      (step) => step.id === nextStepId
    );

    if (nextStepIndex !== -1) {
      this.currentStepIndex = nextStepIndex;
      this.stepHistory.push(nextStepId);
      this.showFormForStep(this.currentStepIndex);
    }

    this.updateStepIndexText();
  }

  prevStep() {
    if (this.stepHistory.length > 1) {
      this.stepHistory.pop();
      const previousStepId = this.stepHistory[this.stepHistory.length - 1];

      this.currentStepIndex = this.steps.findIndex(
        (step) => step.id === previousStepId
      );

      this.showFormForStep(this.currentStepIndex);
    }
    this.updateStepIndexText();
  }

  getCurrentStepId() {
    return this.stepHistory[this.stepHistory.length - 1];
  }

  getNextStepId(currentStepId) {
    const currentStepData = this.steps.find(
      (step) => step.id === currentStepId
    );
    const currentStepKey = currentStepData.keyBack;
    const currentStepValue = this.formData[currentStepKey];

    const sectionRuleKey = this.sectionRules[currentStepKey];

    if (
      sectionRuleKey &&
      sectionRuleKey[currentStepValue] &&
      typeof sectionRuleKey[currentStepValue] !== "object"
    ) {
      return sectionRuleKey[currentStepValue];
    } else {
      if (currentStepKey === "exam_type") {
        const courseTypeValue = this.formData["course_type"];
        return (
          (sectionRuleKey &&
            sectionRuleKey[courseTypeValue] &&
            sectionRuleKey[courseTypeValue][currentStepValue]) ||
          this.nextStepRules["common"]
        );
      }
    }

    // Si el paso actual tiene reglas en nextStepRules
    const nextStepRule = this.nextStepRules[currentStepId];
    if (nextStepRule) {
      if (typeof nextStepRule === "string") {
        return nextStepRule;
      } else if (typeof nextStepRule === "object") {
        return (
          nextStepRule[this.formData["course_type"]] || nextStepRule["common"]
        );
      }
    }

    // Si no hay reglas específicas, avanzar al siguiente paso en la lista
    return this.steps[this.currentStepIndex + 1]?.id;
  }
  // END

  /// BUTTON/LOADER
  cleanInterface(element) {
    element.innerHTML = "";
  }

  enableButton() {
    this.nextButton.classList.remove("disabled-button");
  }
  disableButton() {
    this.nextButton.classList.add("disabled-button");
  }

  enableLoader() {
    this.loaderContainer.style.display = "block";
  }

  disableLoader() {
    this.loaderContainer.style.display = "none";
  }

  //END

  isLastStep() {
    return this.currentStepIndex === this.steps.length - 1;
  }

  applyLastStepChanges() {
    this.changeBtn("Verzenden");
    this.convertDate();
    this.handleProductMijnReservation();
    const data = this.applySubmissionRules();
    if (Number(data.exam_type) === 3) this.formatDateMijnFlow();
    this.completeResume();
    this.nextButton.addEventListener("click", () => {
      this.sendDataBack(data);
    });
  }

  changeBtn(text) {
    this.nextButtonText.innerText = text;
  }

  hideAllForms() {
    const forms = document.querySelectorAll(".form-step");
    forms.forEach((form) => {
      form.classList.remove("active");
    });
  }
  showFormForStep() {
    this.hideAllForms();

    const currentStepId = this.getCurrentStepId();
    const form = document.querySelector(
      `.form-step[data-step-id="${currentStepId}"]` // Modificado
    );
    if (form) {
      form.classList.add("active");
      this.updateNextButtonState();
    }
    this.handleSideEffects();
    this.updateProgressBar();
  }

  handleFormClick(event) {
    const clickedElement = event.target;
    const formStep = clickedElement.closest(".form-step");

    if (formStep) {
      const { keyBack, attribute, keyArray } =
        this.steps[this.currentStepIndex];
      const value = clickedElement.getAttribute(attribute);

      if (value) {
        this.formData[keyBack] = keyArray ? [value] : value;
      }
    }

    if (!this.isLastStep() && !this.noSideEffects) {
      this.updateNextButtonState();
    }
  }

  formatBirthDate(value) {
    let formattedValue = value.replace(/[^0-9\-]/g, "");
    formattedValue = formattedValue.slice(0, 10);

    if (formattedValue.length === 2 || formattedValue.length === 5) {
      if (
        this.lastFormattedValue &&
        formattedValue.length > this.lastFormattedValue.length
      ) {
        formattedValue += "-";
      }
    }

    this.lastFormattedValue = formattedValue;

    return formattedValue;
  }

  validateDate(dateString) {
    const parts = dateString.split("-");
    if (parts.length !== 3) return false;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;

    if (year < 1900 || year > new Date().getFullYear()) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    if (month === 2) {
      const isLeapYear =
        year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
      if (day > 29 || (day === 29 && !isLeapYear)) return false;
    } else if ([4, 6, 9, 11].includes(month) && day > 30) {
      return false;
    }

    return true;
  }

  initBirthDateInput() {
    const birthDateInput = document.getElementById("birthDateInput");
    birthDateInput.addEventListener("input", (event) => {
      const value = event.target.value;
      const formattedValue = this.formatBirthDate(value);
      event.target.value = formattedValue;
    });
  }

  initFormInputEvents() {
    const inputs = document.querySelectorAll('.form_step input[type="text"]');
    inputs.forEach((input) => {
      input.addEventListener("blur", this.handleInputBlur.bind(this));
    });
  }

  handleInputBlur(event) {
    const inputElement = event.target;
    const errorHintId = inputElement.getAttribute("data-error-hint-id");
    const errorHintElement = document.getElementById(errorHintId);

    let isValid = true;
    let errorMessage = "";

    if (!inputElement.value.trim()) {
      errorMessage = "Dit veld is verplicht";
      isValid = false;
    } else if (
      inputElement.getAttribute("data-key-back") === "email" &&
      !this.isValidEmail(inputElement.value)
    ) {
      errorMessage = "E-mail is niet geldig";
      isValid = false;
    }

    if (!isValid) {
      errorHintElement.textContent = errorMessage;
      errorHintElement.style.display = "block";
    } else {
      errorHintElement.style.display = "none";
    }
  }

  handleFormInput(event) {
    if (this.getCurrentStepId() === "stepInputs") {
      const inputElement = event.target;
      const keyBack = inputElement.getAttribute("data-key-back");

      if (keyBack === "birth_date") {
        const formattedBirthDate = this.formatBirthDate(inputElement.value);
        inputElement.value = formattedBirthDate;
        this.formData[keyBack] = formattedBirthDate;

        const birthDateErrorElement = document.getElementById("birthDateError");
        if (!this.validateDate(formattedBirthDate)) {
          birthDateErrorElement.textContent = "Voer een geboortedatum in";
          birthDateErrorElement.style.display = "block";
        } else {
          birthDateErrorElement.style.display = "none";
        }
      } else {
        this.formData[keyBack] = inputElement.value;
      }

      let validationResult =
        this.isValidEmail(this.formData["email"]) &&
        this.validateDate(this.formData["birth_date"]) &&
        this.areAllRequiredInputsFilled();

      validationResult =
        validationResult && document.getElementById("checkbox").checked;
      validationResult ? this.enableButton() : this.disableButton();
    }
  }

  areAllRequiredInputsFilled() {
    const textInputs = document.querySelectorAll(
      '.form_step input[type="text"]'
    );
    return Array.from(textInputs)
      .filter((input) => !input.hasAttribute("data-not-required"))
      .every((input) => input.value.trim() !== "");
  }

  isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  isStepInvalid() {
    const currentStep = this.steps[this.currentStepIndex];

    if (currentStep.keysBack) {
      return currentStep.keysBack.some((key) => {
        return !this.formData.hasOwnProperty(key) || !this.formData[key];
      });
    } else {
      const value = this.formData[currentStep.keyBack];
      return Array.isArray(value) ? value.length === 0 : !value;
    }
  }

  updateStepIndexText() {
    const currentStepNumber = this.stepHistory.includes("overzicht")
      ? this.stepHistory.length - 1
      : this.stepHistory.length || 1;

    const totalSteps = this.calculateTotalSteps();
    const stepIndexTextElement = document.getElementById("stepIndexText");
    const stepIndexTextElementMobile = document.getElementById(
      "stepIndexTextMobile"
    );

    if (stepIndexTextElement) {
      stepIndexTextElement.textContent = `${currentStepNumber} van ${totalSteps}`;
    }
    if (stepIndexTextElementMobile) {
      stepIndexTextElementMobile.textContent = `${currentStepNumber} van ${totalSteps}`;
    }
  }

  calculateTotalSteps() {
    const courseType = this.formData["course_type"];
    const isMijnReservation = this.isMijnReservation();

    return courseType === "offline"
      ? isMijnReservation
        ? 5
        : 7
      : isMijnReservation
      ? 6
      : 8;
  }

  isMijnReservation() {
    return this.formData.exam_type === "3";
  }

  updateNextButtonState() {
    if (this.isLastStep()) {
      this.enableButton();
      this.applyLastStepChanges();
    } else {
      this.changeBtn("Volgende");
      const isInvalid = this.isStepInvalid();
      isInvalid ? this.disableButton() : this.enableButton();
    }
  }

  handleSideEffects() {
    const currentStepId = this.getCurrentStepId();

    switch (currentStepId) {
      case "step4Cities":
        this.getCities();
        this.sideEffects = true;
        break;
      case "step4Cbr":
        this.getCbrLocations();
        this.sideEffects = true;
        break;
      case "stepOnlinePackage":
        this.getPackages();
        this.sideEffects = true;
      case "step4Mijn":
        this.getCbrLocations(false);
        this.setTimeInput();
        this.buildInput();
      case "stepMonths":
        this.handleStepMonths();
        break;
      case "stepCalendar":
        this.initializeCalendar();
      default:
        this.sideEffects = false;
        break;
    }
  }
  //END
  // test
  // GET/SET DATA
  getData() {
    return this.formData;
  }

  setData(key, value) {
    this.formData[key] = value;
  }
  //END

  // PROGRESS BAR

  calculateProgressPercentage() {
    let currentStepNumber = this.stepHistory.length || 1;
    const totalSteps = this.calculateTotalSteps();

    if (currentStepNumber > 1) {
      currentStepNumber--;
    }

    const progressPercentage =
      totalSteps > 1 ? Math.round((currentStepNumber / totalSteps) * 100) : 0;

    return progressPercentage;
  }

  updateProgressBar() {
    const progressBar = document.getElementById("progressFill");
    const percentage = this.calculateProgressPercentage();
    progressBar.style.width = `${percentage}%`;
  }
  //END

  //PRODUCT MIJN RESERVATION
  handleProductMijnReservation() {
    const product = this.getProduct();
    const isMijnReservation = this.isMijnReservation();
    this.setData("product", product);
    this.setData("is_mijn_reservation", isMijnReservation);
  }

  isMijnReservation() {
    return Number(this.formData.exam_type) === 3;
  }

  getProduct() {
    const licenseType = this.formData.license_type;
    const examType = Number(this.formData.exam_type);

    const PRODUCTS_LIST = this.PRODUCTS_LIST;

    let product;

    switch (licenseType) {
      case this.LicenseTypesEnum.MOTOR:
        product =
          examType === 1 || examType === 3
            ? PRODUCTS_LIST.ATH
            : PRODUCTS_LIST.ATH_VE;
        break;

      case this.LicenseTypesEnum.SCOOTER:
        product =
          examType === 1 || examType === 3
            ? PRODUCTS_LIST.AMTH
            : PRODUCTS_LIST.AMTH_VE;
        break;

      default:
        // AUTO
        product =
          examType === 1 || examType === 3
            ? PRODUCTS_LIST.BTH
            : PRODUCTS_LIST.BTH_VE;
    }

    return product;
  }
  //END

  // CITIES
  async getCities() {
    if (this.citiesList.length === 0) {
      try {
        this.enableLoader();
        const resServer = await fetch(this.urls.cities);
        const data = await resServer.json();
        this.citiesList = data.filter(
          (city) =>
            city.license_types.includes(this.formData.license_type) &&
            city.id !== 53
        );
      } catch (error) {
        console.log(error);
      } finally {
        this.disableLoader();
      }
    }
    this.createOptions(this.citiesList, "step4", true);
  }
  // END CITIES

  // MONTHS

  generateDutchMonths() {
    const currentMonth = new Date().getMonth();
    const monthsToShow = this.dutchMonths.slice(currentMonth, currentMonth + 6);

    return monthsToShow.map((month) => month);
  }

  handleStepMonths() {
    const months = this.generateDutchMonths();
    this.createOptions(months, "stepMonthsList", false);
  }

  handleTextChanceMonths() {
    const data = this.formData["course_names"];
    const currentDate = new Date();
    const isWithinFiveDays = currentDate.getDate() >= 5;

    let text;

    if (data.length === 0) {
      text = "- (selecteer data)";
    } else if (data.length === 1) {
      this.isActualMonth(data[0]) && isWithinFiveDays
        ? (text = "klein-gemiggeld")
        : (text = "gemiggeld-groot");
    } else {
      text = "gemiggeld-groot";
    }

    const chanceElement = document.getElementById("chanceMonths");
    if (chanceElement) {
      chanceElement.textContent = text;
    }
  }

  isActualMonth(month) {
    return this.dutchMonths.indexOf(month) === new Date().getMonth();
  }

  // END MONTHS

  createOptions(options, containerId, isCity = true) {
    const newContainer = document.getElementById(containerId);
    this.cleanInterface(newContainer);
    const key = isCity ? "cities" : "course_names";

    options.forEach((option) => {
      const divElement = document.createElement("div");
      divElement.className = "aanmelden_step4-checkbox-item";
      divElement.addEventListener("click", () => {
        this.toggleOptionSelection(option, divElement, isCity);
        this.updateNextButtonState();
        if (!isCity) this.handleTextChanceMonths(options);
      });

      const paragraph = document.createElement("p");
      paragraph.className = "text-weight-bold";
      paragraph.textContent = isCity ? option.name : option;

      divElement.appendChild(paragraph);
      newContainer.appendChild(divElement);

      const value = isCity ? option.id : option;
      if (this.formData[key] && this.formData[key].includes(value)) {
        divElement.classList.add("active");
      }
    });
  }

  toggleOptionSelection(option, divElement, isCity) {
    const key = isCity ? "cities" : "course_names";
    const value = isCity ? option.id : option;

    if (!Array.isArray(this.formData[key])) {
      this.formData[key] = [];
    }

    if (!this.formData[key].includes(value)) {
      this.formData[key].push(value);
      if (isCity) {
        this.citiesNameSelected.push(option.name);
      }
      divElement.classList.add("active");
    } else {
      const index = this.formData[key].indexOf(value);
      this.formData[key].splice(index, 1);
      if (isCity) {
        const cityNameIndex = this.citiesNameSelected.indexOf(option.name);
        if (cityNameIndex !== -1) {
          this.citiesNameSelected.splice(cityNameIndex, 1);
        }
      }
      divElement.classList.remove("active");
    }
  }

  // CBR LOCATIONS
  async getCbrLocations(createElements = true) {
    if (this.cbr_locations.length === 0) {
      try {
        this.enableLoader();
        const resServer = await fetch(this.urls.cbrsLocations);
        const data = await resServer.json();
        this.cbrs_list = data;
      } catch (error) {
        console.log(error);
      } finally {
        this.disableLoader();
      }
    }
    if (createElements) {
      this.createCbrElements(this.cbrs_list);
    } else {
      this.createCbrsSelect(this.cbrs_list);
    }
  }

  createCbrsSelect(data) {
    const selectElement = document.getElementById("selectCbrs");

    data.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option;
      optionElement.text = option;
      selectElement.add(optionElement);
    });

    selectElement.addEventListener("change", (event) => {
      const selectedValue = event.target.value;
      this.setData("mijn_exam_location", selectedValue);
    });
  }

  setTimeInput() {
    const fechaInput = document.getElementById("dateInput");

    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split("T")[0];
    fechaInput.min = formattedDate;

    fechaInput.addEventListener("change", (event) => {
      let fechaSeleccionada = event.target.value;
      const splitDate = fechaSeleccionada.split("-");

      if (splitDate[0].length > 4) {
        const truncatedYear = splitDate[0].slice(0, 4);
        const truncatedDate = truncatedYear + splitDate[1] + splitDate[2];
        fechaInput.value = truncatedDate;
      } else {
        this.datePicked = fechaSeleccionada;
      }
    });
  }

  buildInput() {
    const timeInput = document.getElementById("timeInput");
    const timeError = document.getElementById("timeError");

    timeInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/[^0-9]/g, "");
      if (value.length > 2) {
        value = value.substring(0, 2) + ":" + value.substring(2, 4);
      }
      e.target.value = value;

      if (value.length === 5) {
        const [hours, minutes] = value.split(":").map(Number);
        if (hours > 23 || minutes > 59) {
          timeError.style.display = "block";
          this.setData("mijn_exam_datetime", "");
          this.timePicked = "";
        } else {
          timeError.style.display = "none";
          this.timePicked = `${hours}:${minutes}`;
          this.setData("mijn_exam_datetime", this.timePicked);
        }
      } else {
        timeError.style.display = "block";
      }
    });
  }

  formatDateMijnFlow() {
    const mijn_exam_datetime = this.timePicked;
    const valueDate = this.datePicked;
    if (mijn_exam_datetime && valueDate) {
      this.setData(
        "mijn_exam_datetime",
        `${valueDate}T${mijn_exam_datetime}:00+01:00`
      );
    } else {
      this.setData("mijn_exam_datetime", "");
    }
  }

  createCbrElements(elements) {
    const container = document.getElementById("step4check");
    this.cleanInterface(container);
    elements.forEach((element, index) => {
      const itemContainer = document.createElement("div");
      itemContainer.className = "aanmelden_step4-list_item";

      const label = document.createElement("label");
      label.className = "w-checkbox aanmelden_step4-item";

      const checkboxDiv = document.createElement("div");
      checkboxDiv.className =
        "w-checkbox-input w-checkbox-input--inputType-custom aanmelden_step4-item_checkbox";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = index;
      checkbox.name = element;
      checkbox.style.opacity = 0;
      checkbox.style.position = "absolute";
      checkbox.style.zIndex = -1;

      const span = document.createElement("span");
      span.className = "text-weight-bold w-form-label";
      span.setAttribute("for", element);
      span.textContent = element;

      label.appendChild(checkboxDiv);
      label.appendChild(checkbox);
      label.appendChild(span);
      itemContainer.appendChild(label);

      container.appendChild(itemContainer);

      if (
        this.formData["cbr_locations"] &&
        this.formData["cbr_locations"].includes(element)
      ) {
        checkbox.checked = true;
      }

      checkbox.addEventListener("click", () => {
        this.toggleCbrSelection(element);
        this.updateNextButtonState();
      });
    });
  }

  toggleCbrSelection(element) {
    if (!this.formData["cbr_locations"]) {
      this.formData["cbr_locations"] = [];
    }

    if (!this.formData["cbr_locations"].includes(element)) {
      this.cbr_locations.push(element);
    } else {
      const index = this.cbr_locations.indexOf(element);
      this.cbr_locations.splice(index, 1);
    }
    this.setData("cbr_locations", this.cbr_locations);
  }

  // END LOCATIONS

  // CALENDAR

  initializeCalendar() {
    this.todayCalendar = new Date();
    this.currentMonthCalendar = this.todayCalendar.getMonth();
    this.currentYearCalendar = this.todayCalendar.getFullYear();
    this.selectedDates = new Set();
    this.calendarElement = document.getElementById("calendar");
    this.monthLabel = document.getElementById("monthLabel");
    this.yearLabel = document.getElementById("yearLabel");
    this.chanceElement = document.getElementById("chance");

    this.initializeCalendarButtons();
    this.renderCalendarForMonthYear(
      this.currentMonthCalendar,
      this.currentYearCalendar
    );
  }

  initializeCalendarButtons() {
    const prevMonthButton = document.getElementById("prev");
    const nextMonthButton = document.getElementById("next");

    if (prevMonthButton) {
      prevMonthButton.addEventListener("click", (event) => {
        event.preventDefault();
        if (this.currentMonthCalendar === 0) {
          this.currentMonthCalendar = 11;
          this.currentYearCalendar--;
        } else {
          this.currentMonthCalendar--;
        }
        this.renderCalendarForMonthYear(
          this.currentMonthCalendar,
          this.currentYearCalendar
        );
      });
    }

    if (nextMonthButton) {
      nextMonthButton.addEventListener("click", (event) => {
        event.preventDefault();
        if (this.currentMonthCalendar === 11) {
          this.currentMonthCalendar = 0;
          this.currentYearCalendar++;
        } else {
          this.currentMonthCalendar++;
        }
        this.renderCalendarForMonthYear(
          this.currentMonthCalendar,
          this.currentYearCalendar
        );
      });
    }
  }

  renderCalendarForMonthYear(month, year) {
    this.monthLabel.textContent = this.generateDutchMonths()[month];
    this.yearLabel.textContent = year.toString();

    const dayNames = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = 32 - new Date(year, month, 32).getDate();
    let calendar = `<table class="calendar-table"><thead><tr>`;

    dayNames.forEach((day) => {
      calendar += `<th>${day}</th>`;
    });
    calendar += `</tr></thead><tbody><tr>`;

    const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1;
    const previousMonth = new Date(year, month, 0);
    const previousMonthDays = previousMonth.getDate();

    for (let i = 0; i < firstDayAdjusted; i++) {
      calendar += `<td class="not-current-month disabled">${
        previousMonthDays - firstDayAdjusted + i + 1
      }</td>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      let currentDate = new Date(year, month, day);
      let dateStr = currentDate.toISOString().split("T")[0];
      let isEnabled = this.isDateEnabled(currentDate);
      let tdClass = !isEnabled ? "disabled" : "";
      tdClass += this.selectedDates.has(dateStr) ? " selected-date" : "";

      calendar += `<td class="${tdClass}" data-date="${dateStr}">${day}</td>`;
      if ((firstDayAdjusted + day) % 7 === 0 && day !== daysInMonth) {
        calendar += `</tr><tr>`;
      }
    }

    let daysAdded = 1;
    while ((firstDayAdjusted + daysInMonth + daysAdded - 1) % 7 !== 0) {
      calendar += `<td class="not-current-month disabled">${daysAdded}</td>`;
      daysAdded++;
    }

    calendar += `</tr></tbody></table>`;
    this.calendarElement.innerHTML = calendar;
    this.addEventListenersToDays();
  }

  isDateEnabled(date) {
    const currentDate = new Date();
    const maxDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 5,
      currentDate.getDate()
    );
    return (
      date <= maxDate &&
      date >= currentDate &&
      date.getDay() !== 6 &&
      date.getDay() !== 0
    );
  }

  addEventListenersToDays() {
    const days = this.calendarElement.querySelectorAll(
      "td:not(.disabled):not(.not-current-month)"
    );
    days.forEach((day) => {
      day.addEventListener("click", () => {
        const date = day.getAttribute("data-date");
        if (this.selectedDates.has(date)) {
          this.selectedDates.delete(date);
          day.classList.remove("selected-date");
        } else {
          this.selectedDates.add(date);
          day.classList.add("selected-date");
        }
        this.updateChanceText();
      });
    });
  }

  updateChanceText() {
    const count = this.selectedDates.size;

    const ranges = [
      { min: 1, max: 4, text: "klein-gemiddeld" },
      { min: 5, max: 8, text: "gemiddeld" },
      { min: 9, max: Infinity, text: "gemiddeld-groot" },
    ];

    const selectedRange = ranges.find(
      (range) => count >= range.min && count <= range.max
    );
    const text = selectedRange ? selectedRange.text : "- (selecteer data)";

    this.chanceElement.textContent = text;
    this.formData["course_dates"] = [...this.selectedDates].sort(
      (a, b) => new Date(a) - new Date(b)
    );
    this.formData["chance"] = text;
  }

  // END CALENDAR

  // PACKAGES

  getLastDayOfMonth() {
    const now = new Date();
    const lastDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();
    const currentMonthInDutch = this.dutchMonths[now.getMonth()];

    return `${lastDayOfMonth} ${currentMonthInDutch}`;
  }

  processDescriptionItems(descriptionItems) {
    return descriptionItems.map((item) => {
      if (typeof item.description === "string") {
        return {
          ...item,
          description: item.description.replace(
            "{{ getLastDayOfMonth }}",
            this.getLastDayOfMonth()
          ),
        };
      }
      return item;
    });
  }

  async getPackages() {
    const url = this.urls.plans;

    try {
      this.enableLoader();
      const resServer = await fetch(url);
      const data = await resServer.json();

      this.allAvailablePlans = data
        .filter(
          (item) =>
            item.type === "PUBLIC" &&
            item.license_type === this.formData.license_type
        )
        .map(
          ({ name, description_items, price, old_price, discount_label }) => ({
            name,
            description_items: this.processDescriptionItems(description_items),
            price,
            old_price,
            discount_label,
          })
        );
      this.createPackages(this.allAvailablePlans);
    } catch (error) {
      console.log(error);
    } finally {
      this.disableLoader();
    }
  }

  createPackages(packages) {
    const packageListElement = document.getElementById("packageList");

    this.cleanInterface(packageListElement);

    packages.forEach((pkg) => {
      let packageItem = document.createElement("div");
      packageItem.className = "aanmelden_package-item";
      packageItem.setAttribute("data-package-name", pkg.name);

      packageItem.addEventListener("click", () => {
        this.setData("package_name", pkg.name);
        this.packageSelected = pkg;
        const allPackageItems = document.querySelectorAll(
          ".aanmelden_package-item"
        );
        allPackageItems.forEach((item) => {
          item.classList.remove("selected-option");
        });

        packageItem.classList.add("selected-option");
      });

      this.addPackageItemElements(packageItem, pkg);

      packageListElement.appendChild(packageItem);
    });
  }

  createSvgElement(svgHTML) {
    const template = document.createElement("template");
    svgHTML = svgHTML.trim();
    template.innerHTML = svgHTML;
    return template.content.firstChild;
  }

  createElementWithClass(elementType, className) {
    const element = document.createElement(elementType);
    element.className = className;
    return element;
  }

  createTextElement(elementType, id, className, text) {
    const element = this.createElementWithClass(elementType, className);
    element.id = id;
    element.textContent = text;
    return element;
  }

  appendSvgToElement(element, svgHTML) {
    const svgElement = this.createSvgElement(svgHTML);
    element.appendChild(svgElement);
  }

  addPackageItemElements(packageItem, pkg, isFinalStep = false) {
    const packageInfoContainer = this.createElementWithClass(
      "div",
      "aanmelden_package-info"
    );
    const packagePriceMarginContainer = this.createElementWithClass(
      "div",
      "margin-bottom margin-custom4"
    );
    const packagePriceNameContainer = this.createElementWithClass(
      "div",
      "margin-bottom margin-xsmall"
    );
    const packagePriceNameElement = this.createElementWithClass(
      "div",
      "aanmelden_package-name"
    );
    const separatorClass = isFinalStep
      ? "aanmelden_package-separator_overzicht"
      : "aanmelden_package-separator";
    const packageSeparator = this.createElementWithClass("div", separatorClass);
    const packagePriceContainer = this.createElementWithClass(
      "div",
      "aanmelden_package-price"
    );
    const packagePriceElement = this.createTextElement(
      "div",
      "packagePrice",
      "heading-style-h4",
      `€${parseInt(pkg.price)}`
    );
    const packagePriceSmallElement = this.createTextElement(
      "div",
      "packagePriceSmall",
      "text-size-medium text-weight-bold",
      `${((pkg.price % 1) * 100).toFixed(0).padStart(2, "0")}`
    );
    const packageNameElement = this.createTextElement(
      "div",
      "packageName",
      "text-weight-bold",
      pkg.name
    );

    this.appendSvgToElement(
      packagePriceNameElement,
      `<svg data-v-035cdeba="" width="16" height="15" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.4 5.6V4C14.4 3.78783 14.3157 3.58434 14.1657 3.43431C14.0157 3.28429 13.8122 3.2 13.6 3.2H12.8V4C12.8 4.21217 12.7157 4.41566 12.5657 4.56568C12.4157 4.71571 12.2122 4.8 12 4.8C11.7878 4.8 11.5843 4.71571 11.4343 4.56568C11.2843 4.41566 11.2 4.21217 11.2 4V3.2H4.8V4C4.8 4.21217 4.71571 4.41566 4.56569 4.56568C4.41566 4.71571 4.21217 4.8 4 4.8C3.78783 4.8 3.58434 4.71571 3.43431 4.56568C3.28429 4.41566 3.2 4.21217 3.2 4V3.2H2.4C2.18783 3.2 1.98434 3.28429 1.83431 3.43431C1.68429 3.58434 1.6 3.78783 1.6 4V5.6H14.4ZM14.4 7.2H1.6V12C1.6 12.2122 1.68429 12.4157 1.83431 12.5657C1.98434 12.7157 2.18783 12.8 2.4 12.8H13.6C13.8122 12.8 14.0157 12.7157 14.1657 12.5657C14.3157 12.4157 14.4 12.2122 14.4 12V7.2ZM12.8 1.6H13.6C14.2365 1.6 14.847 1.85286 15.2971 2.30294C15.7471 2.75303 16 3.36348 16 4V12C16 12.6365 15.7471 13.247 15.2971 13.6971C14.847 14.1471 14.2365 14.4 13.6 14.4H2.4C1.76348 14.4 1.15303 14.1471 0.702944 13.6971C0.252856 13.247 0 12.6365 0 12L0 4C0 3.36348 0.252856 2.75303 0.702944 2.30294C1.15303 1.85286 1.76348 1.6 2.4 1.6H3.2V0.8C3.2 0.587827 3.28429 0.384344 3.43431 0.234315C3.58434 0.0842855 3.78783 0 4 0C4.21217 0 4.41566 0.0842855 4.56569 0.234315C4.71571 0.384344 4.8 0.587827 4.8 0.8V1.6H11.2V0.8C11.2 0.587827 11.2843 0.384344 11.4343 0.234315C11.5843 0.0842855 11.7878 0 12 0C12.2122 0 12.4157 0.0842855 12.5657 0.234315C12.7157 0.384344 12.8 0.587827 12.8 0.8V1.6Z" fill="#161616"></path></svg>`
    );
    packagePriceContainer.append(packagePriceElement, packagePriceSmallElement);
    packagePriceMarginContainer.appendChild(packagePriceContainer);
    packagePriceNameContainer.appendChild(packagePriceNameElement);
    packagePriceNameElement.appendChild(packageNameElement);
    packageInfoContainer.append(
      packagePriceMarginContainer,
      packagePriceNameContainer,
      packageSeparator
    );

    const packageDescriptionListMargin = this.createElementWithClass(
      "div",
      "margin-top margin-xsmall"
    );
    const packageDescriptionList = this.createElementWithClass(
      "div",
      "aanmelden_package-list"
    );
    packageDescriptionListMargin.appendChild(packageDescriptionList);

    pkg.description_items.forEach((desc) => {
      const packageDescriptionItem = this.createElementWithClass(
        "div",
        "aanmelden_package-description"
      );
      this.appendSvgToElement(
        packageDescriptionItem,
        `<svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clip-path="url(#clip0_410_3698)">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M9.65024 2.26327L5.00125 7.41733C4.30025 8.19433 3.16425 8.19433 2.46225 7.41733L0.35025 5.07528C-0.11675 4.55828 -0.11675 3.71929 0.35025 3.20029C0.81725 2.68329 1.57425 2.68329 2.04025 3.20029L2.88425 4.13632C3.35225 4.65532 4.11125 4.65532 4.57925 4.13632L7.95926 0.38925C8.42526 -0.12975 9.18323 -0.12975 9.64923 0.38925C10.1172 0.90625 10.1172 1.74627 9.64923 2.26327H9.65024Z" fill="#E1227A"></path>
                            </g>
                            <defs>
                            <clipPath id="clip0_410_3698">
                            <rect width="10" height="8" fill="white"></rect>
                            </clipPath>
                            </defs>
                            </svg >`
      );

      const descriptionItem = this.createElementWithClass(
        "div",
        "text-size-tiny"
      );
      descriptionItem.textContent = desc.description;
      packageDescriptionItem.appendChild(descriptionItem);
      packageDescriptionList.appendChild(packageDescriptionItem);
    });

    packageInfoContainer.appendChild(packageDescriptionListMargin);
    packageItem.appendChild(packageInfoContainer);

    const packageLabelContainer = this.createElementWithClass(
      "div",
      "aanmelden_package-label"
    );
    if (pkg.discount_label) {
      packageLabelContainer.appendChild(
        this.createTextElement(
          "div",
          "packageDiscountLabel",
          "text-size-xtiny text-weight-bold text-style-allcaps",
          pkg.discount_label
        )
      );
    }
    if (pkg.old_price) {
      const packageOldPriceContainer = this.createElementWithClass(
        "div",
        "aanmelden_package-label_price"
      );
      packageOldPriceContainer.appendChild(
        this.createTextElement(
          "div",
          "packageOldPrice",
          "heading-style-h6 text-weight-xbold",
          `€${parseInt(pkg.old_price)}`
        )
      );
      packageOldPriceContainer.appendChild(
        this.createTextElement(
          "div",
          "packageOldPriceSmall",
          "text-size-tiny text-weight-bold",
          `${((pkg.old_price % 1) * 100).toFixed(0).padStart(2, "0")}`
        )
      );
      packageLabelContainer.appendChild(packageOldPriceContainer);
    }
    if (!isFinalStep) {
      packageItem.appendChild(packageLabelContainer);
    }
    if (isFinalStep && pkg.old_price) {
      const discountAmount = pkg.old_price - pkg.price;
      const formattedDiscountAmount = `€${discountAmount.toFixed(2)}`;

      const additionalSeparatorMargin = this.createElementWithClass(
        "div",
        "margin-top margin-xsmall"
      );
      const additionalSeparator = this.createElementWithClass(
        "div",
        separatorClass
      );
      const pricingElementMargin = this.createElementWithClass(
        "div",
        "margin-top margin-xsmall"
      );
      const pricingElementList = this.createElementWithClass(
        "div",
        "overzicht_pricing-list"
      );
      const pricingElementItem = this.createElementWithClass(
        "div",
        "overzicht_pricing-item"
      );
      const oldPriceText = this.createTextElement(
        "div",
        "",
        "text-weight-bold",
        "Subtotaal"
      );
      const formattedOldPrice = `€${parseFloat(pkg.old_price).toFixed(2)}`;
      const oldPrice = this.createTextElement(
        "div",
        "",
        "text-weight-bold",
        formattedOldPrice
      );
      const pricingElementItemDiscount = this.createElementWithClass(
        "div",
        "overzicht_pricing-item"
      );
      const discountText = this.createTextElement(
        "div",
        "",
        "text-weight-bold text-color-pink",
        "Korting"
      );
      const discountPrice = this.createTextElement(
        "div",
        "",
        "text-weight-bold text-color-pink",
        formattedDiscountAmount
      );
      const pricingTotalMargin = this.createElementWithClass(
        "div",
        "margin-top margin-xsmall"
      );
      const pricingTotal = this.createElementWithClass(
        "div",
        "overzicht_pricing-total"
      );
      const formattedPrice = `Totaal: €${parseFloat(pkg.price).toFixed(2)}`;
      const totalTextElement = this.createTextElement(
        "div",
        "",
        "text-size-large text-weight-bold",
        formattedPrice
      );

      packageItem.appendChild(additionalSeparatorMargin);
      packageItem.appendChild(pricingElementMargin);
      additionalSeparatorMargin.appendChild(additionalSeparator);
      pricingElementMargin.appendChild(pricingElementList);
      pricingElementList.appendChild(pricingElementItem);
      pricingElementList.appendChild(pricingElementItemDiscount);
      pricingElementItem.appendChild(oldPriceText);
      pricingElementItem.appendChild(oldPrice);
      pricingElementItemDiscount.appendChild(discountText);
      pricingElementItemDiscount.appendChild(discountPrice);
      pricingTotal.appendChild(totalTextElement);
      packageItem.appendChild(pricingTotalMargin);
      pricingTotalMargin.appendChild(pricingTotal);
    }
  }

  // END PACKAGES

  // RESUME

  completeResume() {
    Object.keys(this.resumeConfig).forEach((key) => this.completeField(key));
    this.completeDataInputs();
  }

  completeField(key) {
    const config = this.resumeConfig[key];
    if (!config) return;

    if (config.customHandler) {
      config.customHandler.call(this);
      return;
    }

    const element = document.getElementById(config.elementId);
    if (!element) return;

    const value = this.formData[key];
    element.textContent = config.textMap[value] ?? value;
  }

  completeDataInputs() {
    Object.keys(this.resumeConfigInputs).forEach((key) => {
      const config = this.resumeConfigInputs[key];
      if (config && config.elementId) {
        const element = document.getElementById(config.elementId);
        if (element) {
          element.textContent = this.formData[key] ?? "-";
        }
      }
    });
  }

  completeCities() {
    const container = document.getElementById("citiesColumn");
    const text = document.getElementById(this.resumeConfig["cities"].elementId);
    if (this.formData["cities"].length > 0) {
      text.textContent = this.citiesNameSelected.join(", ");
      container.classList.remove("hide");
    } else {
      container.classList.add("hide");
    }
  }

  completeCbrLocations() {
    const data = this.formData["cbr_locations"];
    if (!data) return;
    const container = document.getElementById("cbrsColumn");
    const text = document.getElementById(
      this.resumeConfig["cbr_locations"].elementId
    );
    if (data.length > 0) {
      text.textContent = this.cbr_locations.join(", ");
      container.classList.remove("hide");
    } else {
      container.classList.add("hide");
    }
  }

  completeCourseCategory() {
    const key = this.formData["course_category"];
    const courseCategoryTypeTextMap = {
      per_dates: "zo-snel",
      per_month: "maand",
      calendar: "specifieke",
    };

    const element = document.getElementById(courseCategoryTypeTextMap[key]);
    if (element) element.classList.add("active");
  }

  completeCourseNames() {
    const category = this.formData["course_category"];
    const elementId =
      category === "per_dates" ? "zo-snelResume" : "maandResume";
    const targetElement = document.getElementById(elementId);

    if (
      targetElement &&
      Array.isArray(this.formData["course_names"]) &&
      this.formData["course_names"].length > 0
    ) {
      targetElement.textContent = this.formData["course_names"].join(", ");
      targetElement.classList.remove("hide");
    } else if (targetElement) {
      targetElement.classList.add("hide");
    }
  }

  completeCourseDates() {
    const key = this.formData["course_dates"];
    const container = document.getElementById("specifiekeDates");
    container.innerHTML = "";

    const monthNames = [
      "Jan",
      "Feb",
      "Mrt",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Okt",
      "Nov",
      "Dec",
    ];

    if (Array.isArray(this.formData[key]) && this.formData[key].length > 0) {
      const sortedDates = this.formData[key].sort(
        (a, b) => new Date(a) - new Date(b)
      );
      sortedDates.forEach((courseDate) => {
        const date = new Date(courseDate);

        const dayElement = document.createElement("div");
        dayElement.id = "daySelected";
        dayElement.textContent = date.getDate();
        dayElement.classList.add("text-size-tiny", "text-weight-bold");

        const monthElement = document.createElement("div");
        monthElement.id = "monthSelected";
        monthElement.textContent = monthNames[date.getMonth()];
        monthElement.classList.add("text-size-xtiny", "text-weight-bold");

        const dateElement = document.createElement("div");
        dateElement.classList.add("overzicht_info-date");
        dateElement.appendChild(dayElement);
        dateElement.appendChild(monthElement);

        container.appendChild(dateElement);
      });
    }
  }

  completePackage() {
    const container = document.getElementById(
      this.resumeConfig["package_name"].elementId
    );
    if (this.formData["course_type"] === "offline") {
      container.textContent = "Random text"; // reemplazar por el ID cuando modele el offline
    } else {
      // Render package
      const selectedPackage = this.packageSelected;
      if (selectedPackage) {
        container.innerHTML = "";
        let packageElement = document.createElement("div");
        this.addPackageItemElements(packageElement, selectedPackage, true);
        container.appendChild(packageElement);
      } else {
        container.textContent = "No se ha seleccionado ningún paquete.";
      }
    }
  }
  //END RESUME

  applySubmissionRules() {
    Object.keys(this.submissionRules).forEach((key) => {
      const value = this.formData[key];
      const rules = this.submissionRules[key][value];

      if (rules) {
        rules.forEach((field) => {
          this.formData[field] = [];
        });
      }
    });
    return this.formData;
  }

  //SEND DATA

  async handleFinalStep() {
    const data = this.getData();
    const dataResponse = await this.sendDataBack(data);

    if (dataResponse) {
      const {
        course_type,
        is_mijn_reservation,
        payment_amount,
        auth_tokens: { access },
      } = dataResponse;

      const isMijnOnline = course_type === "online" && is_mijn_reservation;
      const buttonText = isMijnOnline ? "Betalen" : "Aanbetaling";
      const isMijnOnlineFlow = isMijnOnline;
      let payment_link;

      const objUrlPayloadPackage = {
        url: this.urls.package_start,
        payload: { package_starting_at: new Date() },
        token: access,
      };

      const objUrlPayloadPayment = {
        url: this.urls.payment_link,
        payload: {
          method: "ideal",
          amount: payment_amount,
          final_redirect_url: this.urls.final_redirect_url,
          fail_redirect_url: this.urls.fail_redirect_url,
        },
        token: access,
      };

      if (isMijnOnlineFlow) {
        await this.requestLinkPayment(objUrlPayloadPackage);
        payment_link = await this.requestLinkPayment(objUrlPayloadPayment);
      } else {
        payment_link = await this.requestLinkPayment(objUrlPayloadPayment);
      }

      if (payment_link) {
        const payloadStorage = {
          ...dataResponse,
          ...payment_link,
          buttonText: buttonText,
        };
        const copyDeepPayloadStorage = JSON.parse(
          JSON.stringify(payloadStorage)
        );
        localStorage.setItem(
          "formData",
          JSON.stringify(copyDeepPayloadStorage)
        );

        localStorage.setItem("userLoggedIn", true);
        updateLoginButton();

        //this.redirectTo("/bestellen");
        //const orderManager = new OrderManager();
      }
    }
  }

  async requestLinkPayment({ url, payload, token }) {
    try {
      this.enableLoader();
      const respuesta = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!respuesta.ok) {
        throw new Error(
          `Error al enviar la solicitud: ${respuesta.status} ${respuesta.statusText}`
        );
      }

      const resultado = await respuesta.json();
      return resultado;
    } catch (error) {
      console.error("Error:", error.message);
      throw error;
    } finally {
      this.disableLoader();
    }
  }

  async sendDataBack(data) {
    const url = this.urls.urlPostMultiStepForm;

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };

    try {
      this.enableLoader();
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error("Error en la respuesta de la red");
      }
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error("Error when sending data:", error);
      return false;
    } finally {
      this.disableLoader();
    }
  }
  // END SEND DATA
}

const steps = [
  { id: "step1", keyBack: "license_type", attribute: "data-license-type" },
  { id: "step2", keyBack: "course_type", attribute: "data-course-type" },
  { id: "step3", keyBack: "exam_type", attribute: "data-exam-type" },
  { id: "step4Cities", keyBack: "cities" },
  { id: "step4Cbr", keyBack: "cbr_locations" },
  { id: "step4Mijn", keysBack: ["mijn_exam_location", "mijn_exam_datetime"] },
  {
    id: "step5",
    keyBack: "course_category",
    attribute: "data-course-category",
  },
  {
    id: "step6",
    keyBack: "course_names",
    attribute: "data-course-name",
    keyArray: true,
  },
  { id: "stepMonths", keyBack: "course_names", attribute: "data-course-name" },
  {
    id: "stepCalendar",
    keyBack: "course_dates",
    attribute: "data-course-name",
  },
  {
    id: "stepOnlinePackage",
    attribute: "data-package-name",
    form: "package_name",
    keyBack: "package_name",
  },
  {
    id: "stepInputs",
    form: "allInputs",
    validations: {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
  },
  { id: "overzicht", form: "Resume" },
];

const formManager = new FormManager(steps);
formManager.initialize();
//}

//if (window.location.pathname === '/bestellen') {

/*
        if (!localStorage.getItem("userLoggedIn")) {
          window.location.href = "/inloggen";
        }
        */
class OrderManager {
  constructor() {
    this.initialize();
  }

  initialize() {
    const storedData = localStorage.getItem("formData");
    if (storedData) {
      const formData = JSON.parse(storedData);
      this.handleStoredData(formData);
    }
  }

  handleStoredData(formData) {
    const link = document.getElementById("btnLink");
    const text = document.getElementById("btnText");
    const amount = document.getElementById("btnAmount");
    text.textContent = formData.buttonText;
    amount.textContent = `€ ${formData.payment_amount}`;
    link.addEventListener("click", function () {
      window.location.href = formData.payment_link;
    });
  }
}
const orderManager = new OrderManager();
//}

/*
        function updateLoginButton() {
          const loginButton = document.getElementById("btn-login");
          if (localStorage.getItem("userLoggedIn")) {
            loginButton.textContent = "Uitloggen";
            loginButton.href = "/inloggen";
          } else {
            loginButton.textContent = "Inloggen";
            loginButton.href = "/inloggen";
          }
        }
  
        document.addEventListener("DOMContentLoaded", updateLoginButton);
  
        document.getElementById("btn-login").addEventListener("click", (event) => {
          if (localStorage.getItem("userLoggedIn")) {
            localStorage.removeItem("userLoggedIn");
            event.target.textContent = "Inloggen";
            window.location.href = "/inloggen";
          }
        });
  
        */
