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
    console.log(this.stepHistory[this.stepHistory.length - 1]);
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

  ///
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
    return this.currentStepIndex === this.steps.length - 1;
  }

  applyLastStepChanges() {
    this.changeBtn("Verzenden");
    this.convertDate();
    this.handleProductMijnReservation();
    this.applyLastStepChanges();
    const data = this.getData();
    this.completeResume(data);

    this.nextButton.addEventListener("click", () => {
      this.sendDataBack(data);
    });
  }

  changeBtn(text) {
    this.nextButton.innerText = text;
  }

  hideAllForms() {
    const forms = document.querySelectorAll(".form-step");
    forms.forEach((form) => {
      form.classList.remove("active");
    });
  }
  showFormForStep() {
    console.log(this.formData);
    this.hideAllForms();

    const currentStepId = this.getCurrentStepId();
    const form = document.querySelector(
      `.form-step[data-step-id="${currentStepId}"]` // Modificado
    );
    if (form) {
      form.classList.add("active");
      this.updateNextButtonState();
    }
    this.handleSideEffects(form);
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

  handleFormInput(event) {
    if (this.getCurrentStepId() === "stepInputs") {
      let validationResult = false;
      const inputElement = event.target;
      const formStep = inputElement.closest(".form-step");
      const textInputs = formStep.querySelectorAll('input[type="text"]');
      const requiredInputs = Array.from(textInputs).filter(
        (input) => !input.hasAttribute("data-not-required")
      );
      const allInputsHaveValue = requiredInputs.every(
        (input) => input.value.trim() !== ""
      );

      const keyBack = inputElement.getAttribute("data-key-back");

      if (keyBack === "email") {
        if (!this.isValidEmail(inputElement.value)) {
          this.disableButton();
          validationResult = false;
          return;
        }
      }

      this.formData[keyBack] = inputElement.value;

      if (!allInputsHaveValue) {
        this.disableButton();
        validationResult = false;
      } else {
        this.enableButton();
        validationResult = true;
      }
      const isCheckboxChecked = document.getElementById("checkbox").checked;
      if (validationResult && isCheckboxChecked) this.enableButton();
      else this.disableButton();
    }
  }

  isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  isStepInvalid() {
    const currentStep = this.steps[this.currentStepIndex];

    if (currentStep.id === "stepCalendar") {
      return (
        !Array.isArray(this.formData["course_dates"]) ||
        this.formData["course_dates"].length === 0
      );
    }

    if (currentStep.keysBack) {
      return !currentStep.keysBack.every(
        (key) => this.formData[key]?.trim() !== ""
      );
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

    if (stepIndexTextElement) {
      stepIndexTextElement.textContent = `${currentStepNumber} van ${totalSteps}`;
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

  handleSideEffects(form) {
    const currentStepId = this.getCurrentStepId();

    switch (currentStepId) {
      case "step4Cities":
        this.getCities(form);
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
        this.buildInputDate();
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
    const basePercentage = 15;
    return Math.round(
      basePercentage +
        (this.currentStepIndex / this.calculateTotalSteps()) *
          (100 - basePercentage)
    );
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
    try {
      const resServer = await fetch(this.urls.cities);
      const data = await resServer.json();
      this.citiesList = data.filter(
        (city) =>
          city.license_types.includes(this.formData.license_type) &&
          city.id !== 53
      );
      this.createOptions(this.citiesList, "step4", true);
    } catch (error) {
      console.log(error);
    }
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
    });
  }
  toggleOptionSelection(option, divElement, isCity) {
    const key = isCity ? "cities" : "course_names";
    const value = isCity ? option.name : option;

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
    try {
      const resServer = await fetch(this.urls.cbrsLocations);
      const data = await resServer.json();
      if (createElements) this.createCbrElements(data);
      else this.createCbrsSelect(data);
    } catch (error) {
      console.log(error);
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
      console.log(this.formData);
    });
  }

  buildInputDate() {
    const dateInput = document.getElementById("dateInput");
    const calendarContainer = document.getElementById("calendarContainer");

    dateInput.addEventListener("click", function () {
      calendarContainer.style.display = "block";
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

      // Validar rango de tiempo
      if (value.length === 5) {
        const [hours, minutes] = value.split(":").map(Number);
        if (hours > 23 || minutes > 59) {
          timeError.style.display = "block";
          this.setData("mijn_exam_datetime", `${hours}:${minutes}`);
        } else {
          timeError.style.display = "none";
          this.setData("mijn_exam_datetime", "");
        }
      } else {
        timeError.style.display = "block";
      }
      console.log(this.formData);
    });
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

      checkbox.addEventListener("click", () => {
        this.toggleCbrSelection(element);
        this.updateNextButtonState();
      });

      const span = document.createElement("span");
      span.className = "text-weight-bold w-form-label";
      span.setAttribute("for", element);
      span.textContent = element;

      label.appendChild(checkboxDiv);
      label.appendChild(checkbox);
      label.appendChild(span);
      itemContainer.appendChild(label);

      container.appendChild(itemContainer);
    });
  }

  toggleCbrSelection(element) {
    const index = this.cbr_locations.indexOf(element);

    if (index === -1) {
      this.cbr_locations.push(element);
    } else {
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
        console.log(this.selectedDates);
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

  addPackageItemElements(packageItem, pkg) {
    let packageInfoContainer = document.createElement("div");
    packageInfoContainer.className = "aanmelden_package-info";
    packageItem.appendChild(packageInfoContainer);

    let packagePriceNameContainer = document.createElement("div");
    packagePriceNameContainer.className = "margin-bottom margin-custom4";
    packageInfoContainer.appendChild(packagePriceNameContainer);

    let packagePriceContainer = document.createElement("div");
    packagePriceContainer.className = "aanmelden_package-price";
    packagePriceNameContainer.appendChild(packagePriceContainer);

    let packagePriceElement = document.createElement("div");
    packagePriceElement.id = "packagePrice";
    packagePriceElement.className = "heading-style-h4";
    packagePriceElement.textContent = `€${parseInt(pkg.price)}`;
    packagePriceContainer.appendChild(packagePriceElement);

    let packagePriceSmallElement = document.createElement("div");
    packagePriceSmallElement.id = "packagePriceSmall";
    packagePriceSmallElement.className = "text-size-medium text-weight-bold";
    packagePriceSmallElement.textContent = `${((pkg.price % 1) * 100)
      .toFixed(0)
      .padStart(2, "0")}`;
    packagePriceContainer.appendChild(packagePriceSmallElement);

    let packageNameElement = document.createElement("div");
    packageNameElement.id = "packageName";
    packageNameElement.className = "text-weight-bold";
    packageNameElement.textContent = pkg.name;
    packagePriceNameContainer.appendChild(packageNameElement);

    let packageDescriptionElement = document.createElement("div");
    packageDescriptionElement.id = "packageDescription";
    packageDescriptionElement.className = "aanmelden_package-list";
    pkg.description_items.forEach((desc) => {
      let descElement = document.createElement("div");
      descElement.className = "text-size-tiny";
      descElement.textContent = desc.description;
      packageDescriptionElement.appendChild(descElement);
    });
    packageInfoContainer.appendChild(packageDescriptionElement);

    let packageLabelContainer = document.createElement("div");
    packageLabelContainer.className = "aanmelden_package-label";
    packageItem.appendChild(packageLabelContainer);

    if (pkg.discount_label) {
      let packageDiscountLabelElement = document.createElement("div");
      packageDiscountLabelElement.id = "packageDiscountLabel";
      packageDiscountLabelElement.className =
        "text-size-xtiny text-weight-bold";
      packageDiscountLabelElement.textContent = pkg.discount_label;
      packageLabelContainer.appendChild(packageDiscountLabelElement);
    }

    if (pkg.old_price) {
      let packageOldPriceContainer = document.createElement("div");
      packageOldPriceContainer.className = "aanmelden_package-label_price";
      packageLabelContainer.appendChild(packageOldPriceContainer);

      let packageOldPriceElement = document.createElement("div");
      packageOldPriceElement.id = "packageOldPrice";
      packageOldPriceElement.className = "heading-style-h6 text-weight-xbold";
      packageOldPriceElement.textContent = `€${parseInt(pkg.old_price)}`;
      packageOldPriceContainer.appendChild(packageOldPriceElement);

      let packageOldPriceSmallElement = document.createElement("div");
      packageOldPriceSmallElement.id = "packageOldPriceSmall";
      packageOldPriceSmallElement.className = "text-size-tiny text-weight-bold";
      packageOldPriceSmallElement.textContent = `${((pkg.old_price % 1) * 100)
        .toFixed(0)
        .padStart(2, "0")}`;
      packageOldPriceContainer.appendChild(packageOldPriceSmallElement);
    }
  }

  // END PACKAGES

  // RESUME

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

  completeResume() {
    Object.keys(this.resumeConfig).forEach((key) => this.completeField(key));
    this.completeDataInputs();
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
    const container = document.getElementById("cbrsColumn");
    const text = document.getElementById(
      this.resumeConfig["cbr_locations"].elementId
    );
    if (this.formData["cbr_locations"].length > 0) {
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
  }

  //SEND DATA

  async handleFinalStep() {
    this.applySubmissionRules();
    const data = this.getData();
    const dataResponse = await this.sendDataBack(data);

    console.log(dataResponse);

    if (dataResponse) {
      const {
        course_type,
        is_mijn_reservation,
        payment_amount,
        auth_tokens: { access },
      } = dataResponse;

      const isMijnOnline = course_type === "online" && is_mijn_reservation;
      const buttonText = isMijnOnline ? "Betalen" : "Aanbetaling";
      const isMijnOnlineFlow = is_mijn_reservation;

      let objUrlPayload;

      isMijnOnlineFlow
        ? (objUrlPayload = {
            url: this.urls.package_start,
            payload: { package_starting_at: new Date() },
          })
        : (objUrlPayload = {
            url: this.urls.payment_link,
            payload: {
              method: "ideal",
              amount: payment_amount,
              final_redirect_url: this.urls.final_redirect_url,
              fail_redirect_url: this.urls.fail_redirect_url,
            },
            token: access,
          });

      const payment_link = await this.requestLinkPayment(objUrlPayload);

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

        //this.redirectTo("/bestellen");
        //const orderManager = new OrderManager();
      }
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
      console.log("Respuesta exitosa:", resultado);
      return resultado;
    } catch (error) {
      console.error("Error en la solicitud:", error.message);
      throw error;
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
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error("Error en la respuesta de la red");
      }
      const responseData = await response.json();
      //console.log("Respuesta del backend:", responseData);
      return responseData;
    } catch (error) {
      console.error("Error al enviar datos al backend:", error);
      return false;
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
