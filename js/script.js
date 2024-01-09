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
    this.citiesList = [];
    this.cities = [];
    this.citiesNameSelected = [];
    this.cbr_locations = [];
    this.stepHistory = [];
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
    this.setInitialCourseTypeFromURL();
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
  setInitialLicenseTypeFromURL() {
    const queryParams = new URLSearchParams(window.location.search);
    const licenseType = queryParams.get("license_type");
    if (licenseType) {
      this.formData["license_type"] = licenseType;
      this.stepHistory.push(this.steps[0].id);
      this.stepHistory.push(this.steps[1].id);
      this.currentStepIndex = this.steps.findIndex(
        (step) => step.id === this.steps[1].id
      );
    }
  }

  setInitialCourseTypeFromURL() {
    const queryParams = new URLSearchParams(window.location.search);
    const courseType = queryParams.get("course_type");
    if (courseType) {
      this.formData["course_type"] = courseType;
      if (this.formData["license_type"]) {
        this.stepHistory.push(this.steps[2].id);
        this.currentStepIndex = this.steps.findIndex(
          (step) => step.id === this.steps[2].id
        );
      }
    }
  }
  // END URL

  // NEXT/PREV STEP

  nextStep() {
    const currentStepId = this.getCurrentStepId();
    const nextStepId = this.getNextStepId(currentStepId);

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
    if (currentStepId === "stepMonths") {
      this.handleStepMonths();
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
    const keyBack = currentStep.keyBack;
    const value = this.formData[keyBack];

    if (Array.isArray(value)) {
      return value.length === 0;
    } else {
      return !value;
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
      this.isStepInvalid() ? this.disableButton() : this.enableButton();
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
      const resServer = await fetch(
        "https://api.develop.nutheorie.be/api/cities/"
      );
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

  generateDutchMonths() {
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

    const currentMonth = new Date().getMonth();
    const monthsToShow = dutchMonths.slice(currentMonth, currentMonth + 6);

    return monthsToShow.map(
      (month) => month.charAt(0).toUpperCase() + month.slice(1)
    );
  }

  handleStepMonths() {
    const months = this.generateDutchMonths();
    this.createOptions(months, "stepMonthsList", false);
  }

  createOptions(options, containerId, isCity = true) {
    const newContainer = document.getElementById(containerId);
    this.cleanInterface(newContainer);
    options.forEach((option) => {
      const divElement = document.createElement("div");
      divElement.className = "aanmelden_step4-checkbox-item";
      divElement.addEventListener("click", () => {
        this.toggleOptionSelection(option, divElement, isCity);
        this.updateNextButtonState();
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

  // END CITIES

  // CBR LOCATIONS
  async getCbrLocations() {
    const url =
      "https://api.develop.nutheorie.be/api/applications/exam_locations/";
    try {
      const resServer = await fetch(url);
      const data = await resServer.json();
      this.createCbrElements(data);
    } catch (error) {
      console.log(error);
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

  // PACKAGES
  async getPackages() {
    const url =
      "https://api.develop.nutheorie.be/api/applications/online_plans/";

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
            description_items,
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
    const packageItemTemplate = document.getElementById("packageItem");

    packages.forEach((pkg) => {
      let packageItem = packageItemTemplate.cloneNode(true);

      packageItem.id = ""; // Eliminar el id para evitar duplicados
      packageItem.className = "aanmelden_package-item";

      // Establece los valores de los precios y nombres
      this.setPriceElements(
        packageItem,
        "#packagePrice",
        "#packagePriceSmall",
        pkg.price,
        "heading-style-h4",
        "text-size-medium text-weight-bold"
      );
      this.setPriceElements(
        packageItem,
        "#packageOldPrice",
        "#packageOldPriceSmall",
        pkg.old_price,
        "heading-style-h6 text-weight-xbold",
        "text-size-tiny text-weight-bold"
      );
      packageItem.querySelector("#packageName").textContent = pkg.name;
      packageItem.querySelector("#packageName").className = "text-weight-bold";

      packageItem.querySelector("#packageDiscountLabel").textContent =
        pkg.discount_label;
      packageItem.querySelector("#packageDiscountLabel").className =
        "text-size-xtiny text-weight-bold";

      // Añade descripciones de elementos
      const packageDescriptionElement = packageItem.querySelector(
        "#packageDescription"
      );
      packageDescriptionElement.className = "aanmelden_package-list";

      pkg.description_items.forEach((desc) => {
        let descElement = document.createElement("div");
        descElement.className = "text-size-tiny";
        descElement.textContent = desc.description;
        packageDescriptionElement.appendChild(descElement);
      });

      packageListElement.appendChild(packageItem);
    });
  }

  setPriceElements(
    packageItem,
    priceSelector,
    centsSelector,
    price,
    priceClass,
    centsClass
  ) {
    const priceElement = packageItem.querySelector(priceSelector);
    const centsElement = packageItem.querySelector(centsSelector);

    priceElement.textContent = `€${parseInt(price)}`;
    priceElement.className = priceClass;

    centsElement.textContent = `${((price % 1) * 100)
      .toFixed(0)
      .padStart(2, "0")}`;
    centsElement.className = centsClass;
  }

  // END PACKAGES

  // RESUME
  completeResume() {
    this.completeLicenseType("license_type");
    this.completeCourseType("course_type");
    this.completeTypeExam("exam_type");
    this.completeCities();
    this.completeCourseCategory("course_category");
    this.completeCourseDates("course_dates");
    this.completeDataInputs();
    this.completeCourseNames();
  }
  completeLicenseType(key) {
    const licenseTypeTextMap = {
      motor: "Motortheorie",
      auto: "Autotheorie",
      scooter: "Scootertheorie",
    };

    document.getElementById("licenseText").textContent =
      licenseTypeTextMap[this.formData[key]] || "";
  }
  completeCourseType(key) {
    const courseTypeTextMap = {
      online: ` Volledige online cursus
  
          Videocursus
          CBR oefenexamens
          E-book `,
      offline: "Dagcursus met aansluitend het examen: 99,-",
    };
    document.getElementById("courseTypeText").textContent =
      courseTypeTextMap[this.formData[key]] || "";
  }

  completeTypeExam(key) {
    const examTypeTextMap = {
      1: "Standaard CBR examen (30 min): 48,-",
      2: "Verlengd CBR examen (45 min): 61,-",
      3: "Ik heb zelf al een examen gereserveerd",
    };
    document.getElementById("examTypeText").textContent =
      examTypeTextMap[Number(this.formData[key])] || "";
  }

  completeCities() {
    const container = document.getElementById("citiesText");
    container.textContent = this.citiesNameSelected.join(", ");
  }
  completeCourseCategory(key) {
    const courseCategoryTypeTextMap = {
      per_dates: "zo-snel",
      per_month: "maand",
      calendar: "specifieke",
    };
    document
      .getElementById(courseCategoryTypeTextMap[this.formData[key]])
      .classList.add("active");
  }
  completeCourseNames() {
    const category = this.formData["course_category"];
    const elementId =
      category === "per_dates" ? "zo-snelResume" : "maandResume";
    const targetElement = document.getElementById(elementId);

    if (targetElement) {
      targetElement.textContent = this.formData["course_names"].join(", ");
    }
  }
  completeCourseDates(key) {
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
      this.formData[key].forEach((courseDate) => {
        const date = new Date(courseDate);

        const dayElement = document.createElement("div");
        dayElement.id = "daySelected";
        dayElement.textContent = date.getDate();

        const monthElement = document.createElement("div");
        monthElement.id = "monthSelected";
        monthElement.textContent = monthNames[date.getMonth()];

        const dateElement = document.createElement("div");
        dateElement.classList.add("overzicht_info-date");
        dateElement.appendChild(dayElement);
        dateElement.appendChild(monthElement);

        container.appendChild(dateElement);
      });
    }
  }

  completeDataInputs() {
    const dataMapping = {
      firstNameText: "first_name",
      lastNameText: "last_name",
      nicknameText: "nickname",
      birthDateText: "birth_date",
      emailText: "email",
      phoneText: "phone",
      address1Text: "address_1",
      address2Text: "address_2",
      address3Text: "address_3",
    };

    Object.entries(dataMapping).forEach(([key, value]) => {
      const element = document.getElementById(key);
      element.textContent = this.formData[value] ?? "-";
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
  sendDataBack(data) {
    const url = "https://api.develop.nutheorie.be/api/applications/";

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };

    fetch(url, options)
      .then((response) => response.json())
      .then((data) => {
        console.log("Respuesta del backend:", data);
      })
      .catch((error) => {
        console.error("Error al enviar datos al backend:", error);
      });
  }
  // END SEND DATA
}

const steps = [
  { id: "step1", keyBack: "license_type", attribute: "data-license-type" },
  { id: "step2", keyBack: "course_type", attribute: "data-course-type" },
  { id: "step3", keyBack: "exam_type", attribute: "data-exam-type" },
  { id: "step4Cities", keyBack: "cities" }, // step para cuando se elige ciudades en offline
  { id: "step4Cbr", keyBack: "cbr_locations" }, // step para cuando se elige CBR en online
  { id: "step4Mijn", keyBack: "mijn_exam_location" }, // step para cuando se elige MIJN
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
  }, // step6 genérico
  { id: "stepMonths", keyBack: "course_names", attribute: "data-course-name" }, // step para course_category per_month
  {
    id: "stepCalendar",
    keyBack: "course_dates",
    attribute: "data-course-name",
  }, // step para course_category calendar
  { id: "stepOnlinePackage", form: "package_name", keyBack: "package_name" }, // paso adicional para paquetes en línea
  {
    id: "stepInputs",
    form: "allInputs",
    validations: {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
  }, // paso final para datos de entrada
  { id: "overzicht", form: "Resume" }, // paso final de resumen
];

const formManager = new FormManager(steps);
formManager.initialize();
//}
