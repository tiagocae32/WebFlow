if (window.location.pathname.includes("/aanmelden")) {
  class FormManager {
    constructor(steps) {
      this.userData = {};
      this.token = null;
      this.getUserInfoBack();
      this.steps = steps;
      this.currentStepIndex = 0;
      this.formData = {};
      this.citiesList = [];
      this.initEnums();
      this.initStepRules();
      this.initElements();
      this.isDateComplete = false;
      this.checkedCities = false;
      this.cities = [];
      this.citiesNameSelected = [];
      this.cbr_locations = [];
      this.cbrs_list = [];
      this.stepHistory = [];
      this.initBirthDateInput();
      this.isEditButtonsInitialized = false;
      this.handleFinalStepBound = this.handleFinalStep.bind(this);
      this.urls = {
        cities: "https://api.develop.nutheorie.be/api/cities/",
        cbrsLocations:
          "https://api.develop.nutheorie.be/api/applications/exam_locations/",
        plans:
          "https://api.develop.nutheorie.be/api/applications/online_plans/",
        urlPostMultiStepForm:
          "https://api.develop.nutheorie.be/api/applications/",
      };
      this.PLANS_DELTA = 29;
      this.REAPPLY_PLANS_DELTA = 19;
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
            online: "Volledige online cursus",
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

      this.isReapplyFlow;
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
        stepOnlinePackage: "stepInputs",
        stepInputs: "overzicht",
      };
      this.submissionRules = {
        course_type: {
          offline: ["cbr_locations"],
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
      this.btnEditSave = document.getElementById("btnEditSave");
      this.nextButton.addEventListener("click", () => this.nextStep());
      this.prevButton.addEventListener("click", () => this.prevStep());
      document.addEventListener("click", (event) =>
        this.handleFormClick(event)
      );
      document.addEventListener("input", (event) =>
        this.handleFormInput(event)
      );
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
      if (this.prevBirthDate !== this.formData["birth_date"]) {
        const change = this.convertDateToISO(this.formData["birth_date"]);
        this.formData["birth_date"] = change;
        this.prevBirthDate = change;
      }
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
          this.stepHistory = [this.steps[0].id, this.steps[1].id];
          this.currentStepIndex = 2;
          this.calculateTotalSteps();
          this.updateStepIndexText();
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
      window.scrollTo({ top: 0, behavior: "smooth" });
      const currentStepId = this.getCurrentStepId();
      const nextStepId = this.getNextStepId(currentStepId);

      if (
        currentStepId === "step4Mijn" &&
        this.formData.course_type === "offline"
      ) {
        if (!this.formData.cities) {
          this.formData.cities = [];
        }
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
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (this.stepHistory.length > 1) {
        this.stepHistory.pop();
        const previousStepId = this.stepHistory[this.stepHistory.length - 1];

        this.currentStepIndex = this.steps.findIndex(
          (step) => step.id === previousStepId
        );

        this.showFormForStep(this.currentStepIndex);
        this.updateStepIndexText();
      }
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

    //END

    isLastStep() {
      return this.getCurrentStepId() === "overzicht";
    }

    applyLastStepChanges() {
      this.enableButton();
      this.convertDate();
      this.handleProductMijnReservation();
      this.applySubmissionRules();
      this.completeResume();
      if (this.formData["course_type"] === "online" && !this.checkedCities) {
        this.checkCities();
        this.checkedCities = true;
      }
    }

    async checkCities() {
      if (this.checkedCities) return;
      const data = await this.fetchCities();
      const citiesOnline = data
        .filter((city) => city.is_online)
        .map((city) => city.id);
      this.formData["cities"] = citiesOnline;
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
      const isOverzichtStep = currentStepId === "overzicht";
      this.toggleButtonsVisibility(!isOverzichtStep);

      const form = document.querySelector(
        `.form-step[data-step-id="${currentStepId}"]`
      );

      const stepIndexWrapper = document.getElementById("stepIndexWrapper");
      if (currentStepId === "overzicht") {
        stepIndexWrapper.classList.add("hide");
        this.setupOverzichtStepButtons();
      } else {
        stepIndexWrapper.classList.remove("hide");
      }

      if (form) {
        form.classList.add("active");
        this.checkEnableNextButton();
      }

      if (this.isLastStep()) {
        this.applyLastStepChanges();
      }
      this.handleSideEffects();
      this.updateProgressBar();
    }

    setupOverzichtStepButtons() {
      const btnPrevLast = document.getElementById("btnPrevLast");
      const btnSend = document.getElementById("btnSend");

      btnSend.removeEventListener("click", this.handleFinalStepBound);
      btnSend.addEventListener("click", this.handleFinalStepBound);
      btnPrevLast.addEventListener("click", () => {
        this.goToStep("stepInputs");
      });
    }

    toggleButtonsVisibility(show) {
      const btnWrapper = document.getElementById("btnWrapper");

      if (show) {
        btnWrapper.classList.remove("hide");
      } else {
        btnWrapper.classList.add("hide");
      }
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
      this.checkEnableNextButton();
    }

    formatBirthDate(value) {
      value = value.replace(/[^0-9\-]/g, "");

      let parts = value.split("-");
      parts[0] = parts[0] ? parts[0].slice(0, 2) : "";
      parts[1] = parts[1] ? parts[1].slice(0, 2) : "";
      parts[2] = parts[2] ? parts[2].slice(0, 4) : "";

      let formattedValue = "";
      if (parts[0]) {
        formattedValue = parts[0];
        if (parts[0].length === 2 || parts[1]) {
          formattedValue += "-";
        }
      }
      if (parts[1]) {
        formattedValue += parts[1];
        if (parts[1].length === 2 || parts[2]) {
          formattedValue += "-";
        }
      }
      if (parts[2]) {
        formattedValue += parts[2];
      }

      this.lastFormattedValue = formattedValue;
      return formattedValue;
    }

    validateDate(dateString) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        dateString = dateString.split("-").reverse().join("-");
      }

      const regex = /^\d{2}-\d{2}-\d{4}$/;
      if (!regex.test(dateString)) {
        return false;
      }

      const [day, month, year] = dateString.split("-").map(Number);

      if (
        year < 1900 ||
        year > new Date().getFullYear() ||
        month < 1 ||
        month > 12
      ) {
        return false;
      }

      return true;
    }

    initBirthDateInput() {
      const birthDateInput = document.getElementById("birthDateInput");

      birthDateInput.addEventListener("keydown", (event) => {
        if (event.key === "Backspace") {
          const cursorPos = birthDateInput.selectionStart;

          if (birthDateInput.value[cursorPos - 1] === "-") {
            event.preventDefault();
            birthDateInput.setSelectionRange(cursorPos - 1, cursorPos - 1);
          }
        }
      });

      birthDateInput.addEventListener("input", (event) => {
        const formattedValue = this.formatBirthDate(event.target.value);
        event.target.value = formattedValue;
        this.formData["birth_date"] = formattedValue;
        this.updateButtonState();
      });
    }

    initFormInputsReapply() {
      if (this.isReapplyFlow) {
        const data = this.userData;

        const formInputs = [
          { key: "first_name", id: "first-name", disabled: true },
          { key: "last_name", id: "last-name", disabled: true },
          { key: "nickname", id: "nickname", disabled: true },
          { key: "birth_date", id: "birthDateInput", disabled: true },
          { key: "email", id: "emailInput", disabled: false },
          { key: "phone", id: "tel", disabled: false },
          { key: "address_1", id: "address", disabled: false },
          { key: "address_2", id: "postal-code", disabled: false },
          { key: "address_3", id: "woonplaats", disabled: false },
        ];

        formInputs.forEach((obj) => {
          const element = document.getElementById(obj.id);
          if (element) {
            if (obj.key === "birth_date") {
              const newFormat = this.convertDateToISO(data[obj.key]);
              element.value = newFormat;
            } else {
              element.value = data[obj.key] || "";
            }
            if (obj.disabled) {
              element.disabled = true;
            }
            this.formData[obj.key] = element.value;
          }
        });
      }
    }

    initFormInputEvents() {
      const contenedorId = "stepInputs";
      const inputs = document.querySelectorAll(
        `#${contenedorId} input[type="text"], #${contenedorId} input[type="number"], #${contenedorId} input[type="email"]`
      );

      inputs.forEach((input) => {
        input.addEventListener("blur", this.handleInputBlur.bind(this));
      });
    }

    handleInputBlur(event) {
      const inputElement = event.target;
      const inputId = inputElement.id;
      const errorHintId = inputId + "Error";
      const errorHintElement = document.getElementById(errorHintId);

      let isValid = true;
      let errorMessage = "";

      if (!inputElement.value.trim()) {
        errorMessage = "Dit veld is verplicht";
        isValid = false;
      }
      if (
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
      this.updateButtonState();
    }

    handleFormInput(event) {
      if (this.getCurrentStepId() === "stepInputs") {
        const inputElement = event.target;
        const keyBack = inputElement.getAttribute("data-key-back");

        if (keyBack === "birth_date") {
          const formattedBirthDate = this.formatBirthDate(inputElement.value);
          inputElement.value = formattedBirthDate;
          this.formData[keyBack] = formattedBirthDate;

          const birthDateErrorElement =
            document.getElementById("birthDateError");
          if (!this.validateDate(formattedBirthDate)) {
            birthDateErrorElement.textContent = "Voer een geboortedatum in";
            birthDateErrorElement.style.display = "block";
          } else {
            birthDateErrorElement.style.display = "none";
          }
        } else {
          this.formData[keyBack] = inputElement.value;
        }
        this.updateButtonState();
      }
    }

    updateButtonState() {
      let validationResult =
        this.isValidEmail(this.formData["email"]) &&
        this.validateDate(this.formData["birth_date"]) &&
        this.areAllRequiredInputsFilled() &&
        document.getElementById("checkbox").checked;
      if (validationResult) {
        this.enableButton();
      } else {
        this.disableButton();
      }
    }

    areAllRequiredInputsFilled() {
      const requiredInputIDs = [
        "first-name",
        "last-name",
        "tel",
        "address",
        "postal-code",
        "woonplaats",
      ];
      return requiredInputIDs
        .map((id) => document.getElementById(id))
        .filter((input) => input != null)
        .every((input) => input.value.trim() !== "");
    }

    isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

    isStepInvalid() {
      const currentStep = this.steps[this.currentStepIndex];

      if (currentStep.keysBack) {
        return currentStep.keysBack.some((key) => {
          const value = this.formData[key];
          return !value || (typeof value === "string" && value.trim() === "");
        });
      } else if (
        currentStep.keyBack &&
        this.formData.hasOwnProperty(currentStep.keyBack)
      ) {
        const value = this.formData[currentStep.keyBack];

        if (Array.isArray(value)) {
          return value.length === 0;
        }

        return typeof value === "string" && value.trim() === "";
      }
      return true;
    }

    updateStepIndexText() {
      let currentStepNumber = this.stepHistory.length;

      if (currentStepNumber === 0) {
        currentStepNumber = 1;
      }

      if (this.stepHistory.includes("overzicht")) {
        currentStepNumber -= 1;
      }

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

    checkEnableNextButton() {
      if (this.getCurrentStepId() !== "stepInputs") {
        const isInvalid = this.isStepInvalid();
        isInvalid ? this.disableButton() : this.enableButton();
      }
    }
    // Show dates for both flows
    showDates() {
      const datesReapply = document.getElementById("datesReapply");
      const datesNoReapply = document.getElementById("datesNoReapply");

      if (this.isReapplyFlow) {
        datesReapply.style.display = "flex";
        datesNoReapply.style.display = "none";
      } else {
        datesNoReapply.style.display = "flex";
        datesReapply.style.display = "none";
      }
    }

    // Check if is reapply flow
    checkIsReapplyFlow() {
      const url = window.location.href;
      const isReapply = url.toLowerCase().includes("&reapply=true");
      if (isReapply) this.isReapplyFlow = true;
      else this.isReapplyFlow = false;
    }

    async getUserInfoBack() {
      const accessToken = getCookiesToken();
      if (accessToken && this.isReapplyFlow) {
        this.token = accessToken;
        try {
          const resServer = await fetch(
            "https://api.develop.nutheorie.be/api/applications/",
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
              },
            }
          );
          const userData = await resServer.json();
          this.userData = userData;
        } catch (error) {
          console.log(error);
        }
      } else {
        this.userData = {};
      }
    }

    handleSideEffects() {
      const currentStepId = this.getCurrentStepId();
      switch (currentStepId) {
        case "step1":
          this.checkIsReapplyFlow();
          this.getUserInfoBack();
          break;
        case "step4Cities":
          this.getCities();
          break;
        case "step4Cbr":
          this.getCbrLocations();
          break;
        case "stepOnlinePackage":
          this.getPackages();
          break;
        case "step4Mijn":
          this.getCbrLocations(false);
          this.setDateInput();
          this.setTimeInput();
          break;
        case "step6":
          this.showDates();
          break;
        case "stepMonths":
          this.handleStepMonths();
          break;
        case "stepCalendar":
          this.initializeCalendar();
          this.checkDates();
          break;
        case "stepInputs":
          this.updateButtonState();
          this.initFormInputEvents();
          this.initFormInputsReapply();
          break;
        case "overzicht":
          this.createEditStepButtons();
          break;
        default:
          break;
      }
    }
    //END

    // GET/SET DATA
    getFormData() {
      return this.formData;
    }

    setFormData(key, value) {
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
      this.setFormData("product", product);
      this.setFormData("is_mijn_reservation", isMijnReservation);
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

        case this.LicenseTypesEnum.AUTO:
          product =
            examType === 1 || examType === 3
              ? PRODUCTS_LIST.BTH
              : PRODUCTS_LIST.BTH_VE;
          break;

        default:
          break;
      }

      return product;
    }
    //END

    // CITIES
    async fetchCities() {
      try {
        const resServer = await fetch(this.urls.cities);
        const data = await resServer.json();
        return data;
      } catch (error) {
        console.log(error);
      }
    }

    async getCities() {
      if (
        this.citiesList.length === 0 ||
        this.prevLicenseType !== this.formData.license_type
      ) {
        delete this.formData.cities;
        this.prevLicenseType = this.formData.license_type;
        try {
          const data = await this.fetchCities();
          this.citiesList = data.filter(
            (city) =>
              city.license_types.includes(this.formData.license_type) &&
              !city.is_online
          );
        } catch (error) {
          console.log(error);
        }
      }
      this.createOptions(this.citiesList, "step4", true);
    }
    // END CITIES

    // MONTHS

    generateDutchMonths(months) {
      const currentMonth = new Date().getMonth();
      const monthsToShow = this.dutchMonths.slice(
        currentMonth,
        currentMonth + months
      );

      return monthsToShow.map((month) => month);
    }

    handleStepMonths() {
      const months = this.generateDutchMonths(6);
      this.createOptions(months, "stepMonthsList", false);
    }

    handleTextChanceMonths() {
      const data = this.formData["course_names"];
      const currentDate = new Date();
      const isWithinFiveDays = currentDate.getDate() >= 5;
      let text = "";

      if (data.length === 0) {
        text = "- (selecteer data)";
      } else if (
        data.length === 1 &&
        this.isActualMonth(data[0]) &&
        isWithinFiveDays
      ) {
        text = "klein-gemiggeld";
      } else {
        text = "gemiggeld-groot";
      }

      const chanceElement = document.getElementById("chanceMonths");
      if (chanceElement) {
        chanceElement.textContent = text;
      }
    }

    handleCourseCategoryChange(newCategory) {
      this.formData["course_category"] = newCategory;
      if (!this.isEditing) {
        this.formData["course_names"] = [];
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
          this.checkEnableNextButton();
          if (!isCity) this.handleTextChanceMonths(options);
        });

        const paragraph = document.createElement("p");
        paragraph.className = "text-weight-bold is-tiny-mobile";
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

    // CBR LOCATIONS GET
    async getCbrLocations(createElements = true) {
      if (this.cbrs_list.length === 0) {
        try {
          const resServer = await fetch(this.urls.cbrsLocations);
          const data = await resServer.json();
          this.cbrs_list = data;
          if (createElements) {
            this.createCbrElements(this.cbrs_list);
          } else {
            this.createCbrsSelect(this.cbrs_list);
          }
        } catch (error) {
          console.log(error);
        }
      } else if (createElements) {
        this.createCbrElements(this.cbrs_list);
      }
    }

    // MIJN STEP

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
        this.setFormData("mijn_exam_location", selectedValue);
      });
    }

    setDateInput() {
      const fechaInput = document.getElementById("dateInput");
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split("T")[0];
      fechaInput.min = formattedDate;

      let lastDatePicked = localStorage.getItem("fechaGlobalSeleccionada");
      this.datePicked = lastDatePicked;

      if (!this.formData.examType) {
        localStorage.removeItem("fechaGlobalSeleccionada");
        this.datePicked = null;
      }

      setInterval(() => {
        let getDatePicked = localStorage.getItem("fechaGlobalSeleccionada");
        if (getDatePicked !== lastDatePicked) {
          lastDatePicked = getDatePicked;
          this.datePicked = getDatePicked;
          this.formatDateMijnFlow();
        }
      }, 1000);
    }

    setTimeInput() {
      const timeInput = document.getElementById("timeInput");
      const timeError = document.getElementById("timeError");

      timeInput.addEventListener("input", (e) => {
        let value = e.target.value.replace(/[^0-9]/g, "");

        if (value.length >= 2) {
          value =
            value.substring(0, 2) +
            (value.length > 2 ? ":" + value.substring(2, 4) : "");
        }
        e.target.value = value;

        const isValid =
          value.length === 5 &&
          parseInt(value.substring(0, 2), 10) <= 23 &&
          parseInt(value.substring(3, 5), 10) <= 59;

        if (isValid) {
          timeError.style.display = "none";
          this.timePicked = value;
        } else {
          timeError.style.display = "block";
          this.timePicked = null;
        }

        this.formatDateMijnFlow();
      });
    }

    formatDateMijnFlow() {
      if (this.datePicked && this.timePicked) {
        this.setFormData(
          "mijn_exam_datetime",
          `${this.datePicked}T${this.timePicked}:00+01:00`
        );
      }
      this.checkEnableNextButton();
    }

    // CBR step

    createCbrElements(elements) {
      const container = document.getElementById("step4check");
      if (!container.hasChildNodes()) {
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

          if (this.formData["cbr_locations"]?.includes(element)) {
            checkbox.checked = true;
            checkboxDiv.classList.add("checked");
          }

          checkbox.addEventListener("click", () => {
            this.toggleCbrSelection(element);
            this.checkEnableNextButton();
          });
        });
      } else {
        elements.forEach((element, index) => {
          const checkbox = container.querySelector(`input[name="${element}"]`);
          if (checkbox) {
            checkbox.checked =
              this.formData["cbr_locations"]?.includes(element);
          }
        });
      }
    }

    toggleCbrSelection(element) {
      if (!Array.isArray(this.formData["cbr_locations"])) {
        this.formData["cbr_locations"] = [];
      }
      const index = this.formData["cbr_locations"].indexOf(element);
      if (index === -1) {
        this.formData["cbr_locations"].push(element);
      } else {
        this.formData["cbr_locations"].splice(index, 1);
      }
    }

    toggleCbrSelection(element) {
      if (!Array.isArray(this.formData["cbr_locations"])) {
        this.formData["cbr_locations"] = [];
      }

      const index = this.formData["cbr_locations"].indexOf(element);

      if (index === -1) {
        this.formData["cbr_locations"].push(element);
      } else {
        this.formData["cbr_locations"].splice(index, 1);
      }
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

      if (!this.isAlreadyRender) {
        this.initializeCalendarButtons();
        this.renderCalendarForMonthYear(
          this.currentMonthCalendar,
          this.currentYearCalendar
        );
      }
      this.isAlreadyRender = true;
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
      this.monthLabel.textContent = this.generateDutchMonths(12)[month];
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
        currentDate.setHours(12, 0, 0, 0);
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
      currentDate.setHours(12, 0, 0, 0);
      const maxDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 5,
        currentDate.getDate()
      );
      maxDate.setHours(23, 59, 59, 999);
      date.setHours(12, 0, 0, 0);

      return (
        date <= maxDate &&
        date >= currentDate &&
        date.getDay() !== 6 &&
        date.getDay() !== 0
      );
    }

    checkDates() {
      const storedDates = this.formData["course_dates"];
      if (storedDates) {
        const datesFormData = new Set(this.formData["course_dates"]);
        this.selectedDates = datesFormData;
        const days = this.calendarElement.querySelectorAll(
          "td:not(.disabled):not(.not-current-month)"
        );
        days.forEach((day) => {
          const date = day.getAttribute("data-date");
          if (this.selectedDates.has(date)) {
            day.classList.add("selected-date");
          } else {
            day.classList.remove("selected-date");
          }
        });
      }
    }

    addEventListenersToDays() {
      const days = this.calendarElement.querySelectorAll(
        "td:not(.disabled):not(.not-current-month)"
      );
      days.forEach((day) => {
        day.addEventListener("click", () => {
          const storedDates = this.formData["course_dates"];
          if (storedDates) {
            this.selectedDates = new Set(storedDates);
          }
          const date = day.getAttribute("data-date");
          if (this.selectedDates.has(date)) {
            this.selectedDates.delete(date);
            day.classList.remove("selected-date");
          } else {
            this.selectedDates.add(date);
            day.classList.add("selected-date");
          }
          this.setFormData("course_dates", this.selectedDates);
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
      if (this.formData["package_name"]) {
        return;
      }

      const url = this.urls.plans;

      try {
        const resServer = await fetch(url);
        const data = await resServer.json();

        const isReapply = this.isReapplyFlow;

        this.allAvailablePlans = data
          .filter(
            (item) =>
              item.type === (isReapply ? "REAPPLY" : "PUBLIC") &&
              item.license_type === this.formData.license_type
          )
          .map(
            ({ name, description_items, price, old_price, discount_label }) => {
              const reapplyValue = this.REAPPLY_PLANS_DELTA;
              const nonReapplyValue = this.PLANS_DELTA;

              const modifiedPrice = isReapply
                ? price + reapplyValue
                : price + nonReapplyValue;
              const modifiedOldPrice = isReapply
                ? old_price + reapplyValue
                : old_price + nonReapplyValue;

              return {
                name,
                description_items:
                  this.processDescriptionItems(description_items),
                price: modifiedPrice,
                old_price: modifiedOldPrice,
                discount_label,
              };
            }
          );
        this.createPackages(this.allAvailablePlans);
      } catch (error) {
        console.log(error);
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
          this.setFormData("package_name", pkg.name);
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
      const packageSeparator = this.createElementWithClass(
        "div",
        separatorClass
      );
      const packagePriceContainer = this.createElementWithClass(
        "div",
        "aanmelden_package-price"
      );
      const packagePriceElement = this.createTextElement(
        "div",
        "packagePrice",
        "heading-style-h4",
        `${parseInt(pkg.price)}`
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
      packagePriceContainer.append(
        packagePriceElement,
        packagePriceSmallElement
      );
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
            `€ ${parseInt(pkg.old_price)}`
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
        packageOldPriceContainer.appendChild(
          this.createElementWithClass(
            "div",
            "online_pricing-separator is-aanmelden"
          )
        );
        packageLabelContainer.appendChild(packageOldPriceContainer);
      }
      if (!isFinalStep) {
        packageItem.appendChild(packageLabelContainer);
      }
      if (isFinalStep && pkg.old_price) {
        const discountAmount = pkg.old_price - pkg.price;
        const formattedDiscountAmount = `- ${discountAmount.toFixed(2)}`;

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
        const formattedOldPrice = `${parseFloat(pkg.old_price).toFixed(2)}`;
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
        const formattedPrice = `Totaal: ${parseFloat(pkg.price).toFixed(2)}`;
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

    updateSvgVisibility() {
      const licenseType = this.formData.license_type;
      const licenseTypes = ["auto", "scooter", "motor"];

      licenseTypes.forEach((type) => {
        const svgId = `${type}Svg`;
        const svgElement = document.getElementById(svgId);

        if (svgElement) {
          if (type === licenseType) {
            svgElement.classList.remove("hide");
          } else {
            svgElement.classList.add("hide");
          }
        }
      });
    }

    updateRowVisibility() {
      const locationsRow = document.getElementById("locationsRow");
      const datesRow = document.getElementById("datesRow");

      const showLocations =
        (this.formData["cities"] && this.formData["cities"].length > 0) ||
        (this.formData["cbr_locations"] &&
          this.formData["cbr_locations"].length > 0);

      const showDates =
        (this.formData["course_names"] &&
          this.formData["course_names"].length > 0) ||
        (this.formData["course_dates"] &&
          this.formData["course_dates"].length > 0);

      if (showLocations) {
        locationsRow.classList.add("active");
      } else {
        locationsRow.classList.remove("active");
      }

      if (showDates) {
        datesRow.classList.add("active");
      } else {
        datesRow.classList.remove("active");
      }
    }

    // Edit information, go to step

    createEditStepButtons() {
      this.backupFormData();
      if (!this.isEditButtonsInitialized) {
        const buttonsData = [
          { id: "editLocations", callback: () => this.determineLocationStep() },
          { id: "editDates", callback: () => this.determineDateStep() },
          { id: "editInputs", callback: () => this.goToStep("stepInputs") },
          {
            id: "editOnlinePackages",
            callback: () => this.goToStep("stepOnlinePackage"),
          },
        ];
        buttonsData.forEach((buttonData) => {
          const button = document.getElementById(buttonData.id);
          if (button) {
            button.addEventListener("click", () => {
              this.isEditing = true;
              buttonData.callback();
              window.scrollTo({ top: 0, behavior: "smooth" });
              this.initializeEditButtons();
              this.showEditButtons();
            });

            if (buttonData.id === "editOnlinePackages") {
              if (this.formData.course_type === "online") {
                button.classList.remove("hide");
              } else {
                button.classList.add("hide");
              }
            }
          }
        });
      }
      this.isEditButtonsInitialized = true;
    }

    backupFormData() {
      this.originalFormData = JSON.parse(JSON.stringify(this.formData));
    }
    determineLocationStep() {
      if (this.formData.course_type === "online") {
        this.goToStep("step4Cbr");
      } else {
        this.goToStep("step4Cities");
      }
    }

    // DETERMINE STEP
    determineDateStep() {
      const categoryMap = {
        per_dates: "step6",
        per_month: "stepMonths",
        calendar: "stepCalendar",
      };

      const category = this.formData.course_category;
      const step = categoryMap[category];

      if (step) {
        this.goToStep(step);
      }
    }

    goToStep(targetStepId) {
      const stepIndex = this.steps.findIndex(
        (step) => step.id === targetStepId
      );
      if (stepIndex === -1) return;

      let currentStepId = this.steps[0].id;
      const newStepHistory = [currentStepId];
      let safetyCounter = 0;

      while (currentStepId !== targetStepId) {
        currentStepId = this.getNextStepId(currentStepId);
        if (
          !currentStepId ||
          !this.steps.find((step) => step.id === currentStepId)
        ) {
          console.error(
            "No se puede alcanzar el paso objetivo desde el paso actual."
          );
          return;
        }
        newStepHistory.push(currentStepId);

        if (++safetyCounter > 100) {
          console.error("Se ha excedido el límite de seguridad en el bucle");
          return;
        }
      }

      this.currentStepIndex = stepIndex;
      this.stepHistory = newStepHistory;
      this.showFormForStep(this.currentStepIndex);
      this.updateStepIndexText();
    }

    // End edit information

    // Cancel edit of the data and save new data

    showEditButtons() {
      const btnEditWrapper = document.getElementById("btnEditWrapper");
      const btnWrapper = document.getElementById("btnWrapper");

      btnEditWrapper.classList.remove("hide");
      btnWrapper.classList.add("hide");
    }

    initializeEditButtons() {
      const btnEditWrapper = document.getElementById("btnEditWrapper");
      const btnSendWrapper = document.getElementById("btnSendWrapper");

      this.btnEditSave.classList.remove("disabled-button");
      const btnEditCancel = document.getElementById("btnEditCancel");

      btnEditCancel.addEventListener("click", () => {
        this.formData = JSON.parse(JSON.stringify(this.originalFormData));
        this.goToStep("overzicht");
        btnEditWrapper.classList.add("hide");
        btnSendWrapper.classList.remove("hide");
      });

      this.btnEditSave.addEventListener("click", () => {
        this.goToStep("overzicht");
        btnEditWrapper.classList.add("hide");
        btnSendWrapper.classList.remove("hide");
      });
    }

    // RESUME

    completeResume() {
      Object.keys(this.resumeConfig).forEach((key) => this.completeField(key));
      this.completeDataInputs();
      this.updateSvgVisibility();
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

      const existingList = element.querySelector(".overzicht_online-list");
      if (existingList) {
        element.removeChild(existingList);
      }

      if (key === "course_type" && value === "online") {
        const list = document.createElement("ul");
        list.className = "overzicht_online-list";

        const items = ["Videocursus", "CBR oefenexamens", "E-book"];
        items.forEach((item) => {
          const listItem = document.createElement("li");
          listItem.textContent = item;
          list.appendChild(listItem);
        });
        element.appendChild(list);
      }
    }

    completeDataInputs() {
      Object.keys(this.resumeConfigInputs).forEach((key) => {
        const config = this.resumeConfigInputs[key];
        if (config && config.elementId) {
          const element = document.getElementById(config.elementId);
          if (element) {
            if (key === "birth_date" && this.formData[key]) {
              const dateParts = this.formData[key].split("-");
              element.textContent = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            } else {
              element.textContent = this.formData[key] ?? "-";
            }
          }
        }
      });
    }

    completeCities() {
      const container = document.getElementById("citiesColumn");
      if (this.formData["course_type"] === "offline") {
        const text = document.getElementById(
          this.resumeConfig["cities"].elementId
        );
        if (this.formData["cities"].length > 0) {
          const selectedCityNames = this.formData["cities"].map((cityId) => {
            const city = this.citiesList.find((c) => c.id === cityId);
            return city ? city.name : "";
          });

          text.textContent = selectedCityNames.join(", ");
          container.classList.remove("hide");
        }
      } else {
        container.classList.add("hide");
      }
      this.updateRowVisibility();
    }

    completeCbrLocations() {
      const data = this.formData["cbr_locations"];
      if (!data) return;
      const container = document.getElementById("cbrsColumn");
      const text = document.getElementById(
        this.resumeConfig["cbr_locations"].elementId
      );

      if (data.length > 0) {
        text.textContent = data.join(", ");
        container.classList.remove("hide");
      } else {
        container.classList.add("hide");
      }
      this.updateRowVisibility();
    }

    completeCourseCategory() {
      const key = this.formData["course_category"];
      const courseCategoryTypeTextMap = {
        per_dates: "zo-snel",
        per_month: "maand",
        calendar: "specifieke",
      };

      const allCategoryElements = document.querySelectorAll(
        ".overzicht_info-dates"
      );
      allCategoryElements.forEach((el) => el.classList.remove("active"));

      const selectedElement = document.getElementById(
        courseCategoryTypeTextMap[key]
      );
      if (selectedElement) selectedElement.classList.add("active");
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
      this.updateRowVisibility();
    }

    completeCourseDates() {
      const courseDates = this.formData["course_dates"];
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

      if (Array.isArray(courseDates) && courseDates.length > 0) {
        const sortedDates = courseDates.sort(
          (a, b) => new Date(a) - new Date(b)
        );
        sortedDates.forEach((courseDate) => {
          const dateParts = courseDate.split("-");
          const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

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
      this.updateRowVisibility();
    }

    completePackage() {
      const container = document.getElementById(
        this.resumeConfig["package_name"].elementId
      );

      const existingPackages = container.getElementsByClassName(
        "overzicht_package-item"
      );
      while (existingPackages.length > 0) {
        existingPackages[0].parentNode.removeChild(existingPackages[0]);
      }
      if (this.formData["course_type"] === "offline") {
        const offlineContent = document.getElementById("overzichtOffline");
        offlineContent.classList.add("active");
      } else {
        // Render package
        const selectedPackage = this.packageSelected;
        if (selectedPackage) {
          let packageElement = document.createElement("div");
          packageElement.classList.add("overzicht_package-item");
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
      const data = await this.sendDataBack();
      if (data) {
        localStorage.setItem("formData", JSON.stringify(data));
        localStorage.setItem("userLoggedIn", true);
        const authTokens = data.auth_tokens;
        const encodedTokens = encodeURIComponent(JSON.stringify(authTokens));
        document.cookie = `tokens=${encodedTokens}`;
        initializeLoginButton();
        return this.redirectTo("/bestellen");
      }
    }

    async sendDataBack() {
      const data = this.getFormData();
      const url = this.urls.urlPostMultiStepForm;

      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      };

      if (this.isReapplyFlow) {
        const accessToken = this.token;
        options.headers["Authorization"] = `Bearer ${accessToken}`;
      }

      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error("Error en la respuesta de la red");
        }
        localStorage.removeItem("fechaGlobalSeleccionada");
        const responseData = await response.json();
        return responseData;
      } catch (error) {
        console.error("Error when sending data:", error);
        return false;
      }
    }
    // END SEND DATA
  }

  // STEPS
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
    {
      id: "stepMonths",
      keyBack: "course_names",
      attribute: "data-course-name",
    },
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
    },
    { id: "overzicht", form: "Resume" },
  ];
  //END STEPS

  const formManager = new FormManager(steps);
  formManager.initialize();
}

if (window.location.pathname === "/bestellen") {
  if (!localStorage.getItem("userLoggedIn")) {
    window.location.href = "/inloggen";
  }

  class OrderManager {
    constructor() {
      this.package_starting_at = null;
      this.isMijnOnline = null;
      this.containerMijn = document.getElementById("bestellenMijn");
      this.containerDefault = document.getElementById("bestellenDefault");
      this.buttonLink = document.getElementById("btnLink");
      this.buttonText = document.getElementById("btnText");
      this.urlPaymentLink =
        "https://api.develop.nutheorie.be/api/applications/payment_link/";
      this.urlPackageStart =
        "https://api.develop.nutheorie.be/api/applications/set_package_start/";
      this.urlFinalRedirect = "https://develop.nutheorie.be/user-profile";
      this.urlFailRedirect = "https://develop.nutheorie.be/betaling/failed";
      this.initialize();
    }

    initialize() {
      const storedData = localStorage.getItem("formData");
      if (storedData) {
        const formData = JSON.parse(storedData);
        this.displayOrderSummary(formData);
        this.handleStoredData(formData);
        this.isMijnOnline =
          formData.course_type === "online" && formData.is_mijn_reservation;
        this.buttonText.textContent = this.isMijnOnline
          ? "Betalen"
          : "Aanbetaling";
        this.handleContainer(formData);
        this.buttonLink.addEventListener("click", () =>
          this.requestLink(formData)
        );
        this.minuteCalendar = this.hourCalendar = this.dateCalendar = null;
      }
    }

    getLastDayOfMonth() {
      const now = new Date();
      const lastDayOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate();
      const dutchMonths = [
        "januari",
        "februari",
        "maart",
        "april",
        "mei",
        "juni",
        "juli",
        "augustus",
        "september",
        "oktober",
        "november",
        "december",
      ];
      const currentMonthInDutch = dutchMonths[now.getMonth()];

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

    generatePackage(formData) {
      const packageElement = document.querySelector(".overzicht_package-item");
      const pkg = formData.package_info;
      const paymentAmount = formData.payment_amount;

      const priceParts = paymentAmount.split(".");
      const priceBeforeDecimal = priceParts[0];
      const priceAfterDecimal = priceParts[1];

      let priceDiv = packageElement.querySelector("#price");
      priceDiv.textContent = priceBeforeDecimal;

      let priceSmallDiv = packageElement.querySelector("#priceSmall");
      priceSmallDiv.textContent = priceAfterDecimal;

      let packageNameDiv = packageElement.querySelector("#packageName");
      packageNameDiv.textContent = formData.package_name;

      const processedDescriptions = this.processDescriptionItems(
        pkg.description_items
      );

      let packageListDiv = packageElement.querySelector(
        ".aanmelden_package-list"
      );
      processedDescriptions.forEach((description) => {
        let descriptionDiv = document.createElement("div");
        descriptionDiv.classList.add("aanmelden_package-description");

        let svgElement = document.createElement("div");
        svgElement.innerHTML = `<svg data-v-035cdeba="" width="16" height="15" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.4 5.6V4C14.4 3.78783 14.3157 3.58434 14.1657 3.43431C14.0157 3.28429 13.8122 3.2 13.6 3.2H12.8V4C12.8 4.21217 12.7157 4.41566 12.5657 4.56568C12.4157 4.71571 12.2122 4.8 12 4.8C11.7878 4.8 11.5843 4.71571 11.4343 4.56568C11.2843 4.41566 11.2 4.21217 11.2 4V3.2H4.8V4C4.8 4.21217 4.71571 4.41566 4.56569 4.56568C4.41566 4.71571 4.21217 4.8 4 4.8C3.78783 4.8 3.58434 4.71571 3.43431 4.56568C3.28429 4.41566 3.2 4.21217 3.2 4V3.2H2.4C2.18783 3.2 1.98434 3.28429 1.83431 3.43431C1.68429 3.58434 1.6 3.78783 1.6 4V5.6H14.4ZM14.4 7.2H1.6V12C1.6 12.2122 1.68429 12.4157 1.83431 12.5657C1.98434 12.7157 2.18783 12.8 2.4 12.8H13.6C13.8122 12.8 14.0157 12.7157 14.1657 12.5657C14.3157 12.4157 14.4 12.2122 14.4 12V7.2ZM12.8 1.6H13.6C14.2365 1.6 14.847 1.85286 15.2971 2.30294C15.7471 2.75303 16 3.36348 16 4V12C16 12.6365 15.7471 13.247 15.2971 13.6971C14.847 14.1471 14.2365 14.4 13.6 14.4H2.4C1.76348 14.4 1.15303 14.1471 0.702944 13.6971C0.252856 13.247 0 12.6365 0 12L0 4C0 3.36348 0.252856 2.75303 0.702944 2.30294C1.15303 1.85286 1.76348 1.6 2.4 1.6H3.2V0.8C3.2 0.587827 3.28429 0.384344 3.43431 0.234315C3.58434 0.0842855 3.78783 0 4 0C4.21217 0 4.41566 0.0842855 4.56569 0.234315C4.71571 0.384344 4.8 0.587827 4.8 0.8V1.6H11.2V0.8C11.2 0.587827 11.2843 0.384344 11.4343 0.234315C11.5843 0.0842855 11.7878 0 12 0C12.2122 0 12.4157 0.0842855 12.5657 0.234315C12.7157 0.384344 12.8 0.587827 12.8 0.8V1.6Z" fill="#161616"></path></svg>`;
        descriptionDiv.appendChild(svgElement);

        let descriptionTextDiv = document.createElement("div");
        descriptionTextDiv.classList.add("text-size-tiny");
        descriptionTextDiv.textContent = description.description;
        descriptionDiv.appendChild(descriptionTextDiv);

        packageListDiv.appendChild(descriptionDiv);
      });

      let priceSubtotalDiv = packageElement.querySelector("#priceSubtotal");
      priceSubtotalDiv.textContent = pkg.old_price;

      let priceKortingDiv = packageElement.querySelector("#priceKorting");
      let discount =
        parseFloat(pkg.old_price) -
        parseFloat(priceBeforeDecimal + "." + priceAfterDecimal);
      priceKortingDiv.textContent = `- ${discount.toFixed(2)}`;

      let priceTotalDiv = packageElement.querySelector("#priceTotal");
      priceTotalDiv.textContent = ` ${paymentAmount}`;
    }

    async requestLink(formData) {
      const { payment_amount } = formData;

      const access = getCookiesToken();

      let payment_link;
      let package_starting_at = this.formatCalendarDate();

      const objUrlPayloadPackage = {
        url: this.urlPackageStart,
        payload: { package_starting_at },
        token: access,
      };

      const objUrlPayloadPayment = {
        url: this.urlPaymentLink,
        payload: {
          method: "ideal",
          amount: payment_amount,
          final_redirect_url: this.urlFinalRedirect,
          fail_redirect_url: this.urlFailRedirect,
        },
        token: access,
      };
      if (this.isMijnOnline) {
        await this.requestLinkPayment(objUrlPayloadPackage);
        payment_link = await this.requestLinkPayment(objUrlPayloadPayment);
      } else {
        payment_link = await this.requestLinkPayment(objUrlPayloadPayment);
      }
      if (payment_link) {
        window.location.href = payment_link.payment_link;
      }
    }

    async requestLinkPayment({ url, payload, token }) {
      try {
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
      }
    }

    handleContainer(formData) {
      const bestellenImage = document.getElementById("bestellenImage");
      const bestellenMijnPackage = document.getElementById(
        "bestellenMijnPackage"
      );
      if (this.isMijnOnline) {
        this.containerMijn.style.display = "flex";
        this.containerDefault.style.display = "none";
        bestellenMijnPackage.style.display = "block";
        bestellenImage.style.display = "none";
        this.generateContainerMijn();
        this.generatePackage(formData);
      } else {
        this.containerMijn.style.display = "none";
        this.containerDefault.style.display = "block";
        bestellenMijnPackage.style.display = "none";
        bestellenImage.style.display = "block";
      }
    }

    generateContainerMijn() {
      this.buttonLink.classList.add("disabled-button");
      const radioDiv1 = document.createElement("div");
      radioDiv1.classList.add("bestellen_mijn-radio");

      const radio1 = document.createElement("input");
      radio1.type = "radio";
      radio1.id = "radio1";
      radio1.name = "mijnOption";
      radio1.value = "direct";
      radio1.classList.add("mijnRadio");

      const label1 = document.createElement("label");
      label1.htmlFor = "radio1";
      label1.textContent = "Direct activeren";
      label1.classList.add("text-weight-semibold");

      radioDiv1.appendChild(radio1);
      radioDiv1.appendChild(label1);

      const radioDiv2 = document.createElement("div");
      radioDiv2.classList.add("bestellen_mijn-radio");

      const radio2 = document.createElement("input");
      radio2.type = "radio";
      radio2.id = "radio2";
      radio2.name = "mijnOption";
      radio2.value = "option2";
      radio2.classList.add("mijnRadio");
      radio1.addEventListener("change", () => {
        dateInput.style.display = "none";
        this.cleanCalendar();
        this.getCurrentDateTime();
        this.minuteCalendar = this.hourCalendar = this.dateCalendar = null;
      });
      radio2.addEventListener("change", () => this.handleRadioChange());

      const label2 = document.createElement("label");
      label2.htmlFor = "radio2";
      label2.textContent = "Vul de datum in wanneer je pakket in moet gaan";
      label2.classList.add("text-weight-semibold");

      radioDiv2.appendChild(radio2);
      radioDiv2.appendChild(label2);

      this.containerMijn.appendChild(radioDiv1);
      this.containerMijn.appendChild(radioDiv2);

      const dateInput = document.createElement("input");
      dateInput.type = "date";
      dateInput.id = "dateInput";
      dateInput.style.display = "none";
      const today = new Date().toISOString().split("T")[0];
      dateInput.min = today;
      dateInput.addEventListener("input", (event) =>
        this.setCalendarDate(event)
      );

      const timePicker = document.createElement("div");
      timePicker.id = "timePicker";
      timePicker.classList.add("time-picker");

      const hourList = document.createElement("ul");
      hourList.id = "hourList";
      hourList.classList.add("time-list");

      for (let i = 0; i < 24; i++) {
        const hourItem = document.createElement("li");
        hourItem.textContent = (i < 10 ? "0" : "") + i;
        hourItem.classList.add("time-item");
        hourItem.onclick = () => {
          this.setHourCalendar(i);
          this.updateSelected(hourList, hourItem);
        };
        hourList.appendChild(hourItem);
      }

      const minuteList = document.createElement("ul");
      minuteList.id = "minuteList";
      minuteList.classList.add("time-list");

      for (let i = 0; i < 60; i++) {
        const minuteItem = document.createElement("li");
        minuteItem.textContent = (i < 10 ? "0" : "") + i;
        minuteItem.classList.add("time-item");
        minuteItem.onclick = () => {
          this.setMinuteCalendar(i);
          this.updateSelected(minuteList, minuteItem);
        };
        minuteList.appendChild(minuteItem);
      }

      timePicker.appendChild(hourList);
      timePicker.appendChild(minuteList);

      this.containerMijn.appendChild(dateInput);
      this.containerMijn.appendChild(timePicker);
    }

    handleRadioChange() {
      this.buttonLink.classList.add("disabled-button");
      const radio2 = document.getElementById("radio2");
      const dateInput = document.getElementById("dateInput");
      const timePicker = document.getElementById("timePicker");
      dateInput.style.display = radio2.checked ? "block" : "none";
    }

    cleanCalendar() {
      const dateInput = document.getElementById("dateInput");
      if (dateInput) {
        dateInput.value = "";
      }

      const hourListItems = document.querySelectorAll("#hourList .time-item");
      const minuteListItems = document.querySelectorAll(
        "#minuteList .time-item"
      );

      for (const item of hourListItems) {
        item.classList.remove("selected");
      }

      for (const item of minuteListItems) {
        item.classList.remove("selected");
      }
    }

    updateSelected(list, selectedItem) {
      list.querySelectorAll(".selected").forEach((item) => {
        item.classList.remove("selected");
      });
      selectedItem.classList.add("selected");
    }

    setCalendarDate(event) {
      const timePicker = document.getElementById("timePicker");
      this.dateCalendar = event.target.value;
      if (this.dateCalendar) {
        timePicker.classList.add("visible");
      } else {
        timePicker.classList.remove("visible");
      }
      this.enableButton();
    }

    setHourCalendar(hour) {
      hour = Number(hour);
      this.hourCalendar = hour < 10 ? "0" + hour : "" + hour;
      this.enableButton();
      if (this.minuteCalendar !== null) {
        this.checkAndHideTimePicker();
      }
    }

    setMinuteCalendar(minute) {
      minute = Number(minute);
      this.minuteCalendar = minute < 10 ? "0" + minute : "" + minute;
      this.enableButton();
      if (this.hourCalendar !== null) {
        this.checkAndHideTimePicker();
      }
    }

    checkAndHideTimePicker() {
      const timePicker = document.getElementById("timePicker");
      if (timePicker) {
        timePicker.classList.remove("visible");
      }
    }

    enableButton() {
      if (this.dateCalendar && this.hourCalendar && this.minuteCalendar) {
        this.buttonLink.classList.remove("disabled-button");
      } else {
        this.buttonLink.classList.add("disabled-button");
      }
    }

    formatCalendarDate() {
      if (this.dateCalendar && this.hourCalendar && this.minuteCalendar) {
        return `${this.dateCalendar}T${this.hourCalendar}:${this.minuteCalendar}:00+01:00`;
      }
      return this.getCurrentDateTime();
    }

    getCurrentDateTime() {
      const currentDateTime = new Date();
      const year = currentDateTime.getFullYear();
      const month = currentDateTime.getMonth() + 1;
      const day = currentDateTime.getDate();
      const hour = currentDateTime.getHours();
      const minutes = currentDateTime.getMinutes();
      const seconds = currentDateTime.getSeconds();
      const finalDate = `${year}-${month}-${day}T${hour}:${minutes}:${seconds}+01:00`;
      this.buttonLink.classList.remove("disabled-button");
      return finalDate;
    }

    updateSvgVisibility(formData) {
      const licenseType = formData.license_type;
      const licenseTypes = ["auto", "scooter", "motor"];

      licenseTypes.forEach((type) => {
        const svgId = `${type}Svg`;
        const svgElement = document.getElementById(svgId);

        if (svgElement) {
          if (type === licenseType) {
            svgElement.classList.remove("hide");
          } else {
            svgElement.classList.add("hide");
          }
        }
      });
    }

    updateRowVisibility(formData) {
      const showLocations =
        (formData.cities && formData.cities.length > 0) ||
        (formData.cbr_locations && formData.cbr_locations.length > 0);
      const showDates =
        (formData.course_names && formData.course_names.length > 0) ||
        (formData.course_dates && formData.course_dates.length > 0);

      const locationsRow = document.getElementById("locationsRow");
      const datesRow = document.getElementById("datesRow");

      locationsRow.classList.toggle("active", showLocations);
      datesRow.classList.toggle("active", showDates);
    }

    toggleElementVisibility(elementId, shouldShow) {
      const element = document.getElementById(elementId);
      if (element) {
        if (shouldShow) {
          element.classList.remove("hide");
        } else {
          element.classList.add("hide");
        }
      }
    }

    getExamTypeText(product, is_mijn_reservation) {
      const examTypeTextMap = {
        bth: "Standaard CBR examen (30 min): 48,-",
        bth_ve: "Verlengd CBR examen (45 min): 61,-",
        ath: "Standaard CBR examen (30 min): 48,-",
        ath_ve: "Verlengd CBR examen (45 min): 61,-",
        amth: "Standaard CBR examen (30 min): 48,-",
        amth_ve: "Verlengd CBR examen (45 min): 61,-",
      };
      if (is_mijn_reservation) return "Ik heb zelf al een examen gereserveerd";
      else return examTypeTextMap[product];
    }

    // DISPLAY ORDER SUMMARY BESTELLEN
    displayOrderSummary(formData) {
      this.displayResumeConfiguration(formData);
      this.displayCourseCategory(formData);
      this.displayExamType(formData);
      this.displayCities(formData);
      this.displayCBRLocations(formData);
      this.displayCourseNames(formData);
      this.updateRowVisibility(formData);
      this.updateSvgVisibility(formData);
    }

    displayResumeConfiguration(formData) {
      const resumeConfig = {
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
            online: "Volledige online cursus",
            offline: "Dagcursus met aansluitend het examen: 99,-",
          },
        },
      };

      Object.keys(resumeConfig).forEach((key) => {
        const config = resumeConfig[key];
        const element = document.getElementById(config.elementId);
        if (!element) return;

        const value = formData[key];
        element.textContent = config.textMap[value] ?? value;

        if (key === "course_type" && value === "online") {
          this.displayOnlineCourseList(element);
        }
      });
    }

    displayOnlineCourseList(element) {
      const existingList = element.querySelector(".overzicht_online-list");
      if (existingList) {
        element.removeChild(existingList);
      }

      const list = document.createElement("ul");
      list.className = "overzicht_online-list";
      const items = ["Videocursus", "CBR oefenexamens", "E-book"];
      items.forEach((item) => {
        const listItem = document.createElement("li");
        listItem.textContent = item;
        list.appendChild(listItem);
      });
      element.appendChild(list);
    }

    displayCourseCategory(formData) {
      const courseCategoryTypeTextMap = {
        per_dates: "zo-snel",
        per_month: "maand",
        calendar: "specifieke",
      };
      const courseCategoryElementId =
        courseCategoryTypeTextMap[formData.course_category];
      if (courseCategoryElementId) {
        const courseCategoryElement = document.getElementById(
          courseCategoryElementId
        );
        courseCategoryElement.classList.add("active");
      }
    }

    displayExamType(formData) {
      const examTypeText = this.getExamTypeText(
        formData.product,
        formData.is_mijn_reservation
      );
      if (examTypeText) {
        const examTypeElement = document.getElementById("examTypeText");
        examTypeElement.textContent = examTypeText;
      }
    }

    displayCities(formData) {
      this.toggleElementVisibility(
        "citiesColumn",
        formData.cities && formData.cities.length > 0
      );
      if (formData.cities && formData.cities.length > 0) {
        const citiesElement = document.getElementById("citiesText");
        citiesElement.textContent = formData.cities.join(", ");
      }
    }

    displayCBRLocations(formData) {
      this.toggleElementVisibility(
        "cbrsColumn",
        formData.cbr_locations && formData.cbr_locations.length > 0
      );
      if (formData.cbr_locations && formData.cbr_locations.length > 0) {
        const cbrLocationsElement = document.getElementById("cbrLocationsText");
        cbrLocationsElement.textContent = formData.cbr_locations.join(", ");
      }
    }

    displayCourseNames(formData) {
      switch (formData.course_category) {
        case "per_dates":
          this.displayCourseNamesByCategory(
            "course_names",
            "zo-snelResume",
            formData
          );
          break;
        case "per_month":
          this.displayCourseNamesByCategory(
            "course_names",
            "maandResume",
            formData
          );
          break;
        case "calendar":
          this.displayCourseDates("course_dates", "specifiekeDates", formData);
          break;
      }
    }

    displayCourseNamesByCategory(categoryKey, elementId, formData) {
      if (formData[categoryKey] && Array.isArray(formData[categoryKey])) {
        const element = document.getElementById(elementId);
        element.textContent = formData[categoryKey].join(", ");
      }
    }

    displayCourseDates(categoryKey, elementId, formData) {
      if (formData[categoryKey] && Array.isArray(formData[categoryKey])) {
        const element = document.getElementById(elementId);
        element.innerHTML = "";

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
        const sortedDates = formData[categoryKey].sort(
          (a, b) => new Date(a) - new Date(b)
        );

        sortedDates.forEach((courseDate) => {
          const date = new Date(courseDate);
          const dayDiv = document.createElement("div");
          dayDiv.id = "daySelected";
          dayDiv.classList.add("text-size-tiny", "text-weight-bold");
          dayDiv.textContent = date.getDate();

          const monthDiv = document.createElement("div");
          monthDiv.id = "monthSelected";
          monthDiv.classList.add("text-size-xtiny", "text-weight-bold");
          monthDiv.textContent = monthNames[date.getMonth()];

          const dateDiv = document.createElement("div");
          dateDiv.classList.add("overzicht_info-date");
          dateDiv.appendChild(dayDiv);
          dateDiv.appendChild(monthDiv);

          element.appendChild(dateDiv);
        });
      }
    }

    handleStoredData(formData) {
      const amount = document.getElementById("btnAmount");
      const aanbetalingAmount = document.getElementById("aanbetalingTotal");
      amount.textContent = `€ ${formData.payment_amount}`;
      const paymentAmount = parseFloat(formData.payment_amount);
      let formattedAmount = "";

      if (!isNaN(paymentAmount)) {
        if (Math.floor(paymentAmount) === paymentAmount) {
          formattedAmount = `${paymentAmount},-`;
        } else {
          formattedAmount = `${paymentAmount.toFixed(2)},-`;
        }
      } else {
        formattedAmount = "Error";
      }

      aanbetalingAmount.textContent = ` ${formattedAmount}`;
    }
  }
  const orderManager = new OrderManager();
}

function initializeLoginButton() {
  const loginButton = document.getElementById("btn-login");
  if (loginButton) {
    if (localStorage.getItem("userLoggedIn")) {
      loginButton.textContent = "Uitloggen";
    } else {
      loginButton.textContent = "Inloggen";
    }

    loginButton.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = "/inloggen";
    });
  }
}

document.addEventListener("DOMContentLoaded", initializeLoginButton);

function getCookiesToken() {
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const partes = cookie.split("=");
    if (partes[0].trim() === "tokens") {
      const encodedTokens = partes[1];
      try {
        const decodedTokens = decodeURIComponent(encodedTokens);
        const tokens = JSON.parse(decodedTokens);
        return tokens.access;
      } catch (error) {
        console.error("Error al decodificar la cookie tokens:", error);
        return null;
      }
    }
  }
  return null;
}
