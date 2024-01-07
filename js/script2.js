class FormManager {
  constructor(steps) {
    this.steps = steps;
    this.currentStepIndex = 0;
    this.formData = {};
    this.nextButton = document.getElementById("btn-next");
    this.prevButton = document.getElementById("btn-prev");
    this.citiesList = [];
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
    this.citiesNameSelected = [];
  }

  //INITIALIZE
  initialize() {
    this.nextButton.addEventListener("click", () => this.nextStep());
    this.prevButton.addEventListener("click", () => this.prevStep());
    document.addEventListener("click", (event) => this.handleFormClick(event));
    document.addEventListener("input", (event) => this.handleFormInput(event));
    this.showFormForStep(this.currentStepIndex);
  }

  // NEXT/PREV STEP
  nextStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.showFormForStep(this.currentStepIndex);
    }
  }

  prevStep() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.showFormForStep(this.currentStepIndex);
    }
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

  checkIsLastStep() {
    //console.log(this.getTotalSteps(), this.steps[this.currentStepIndex].id);
    if (this.steps[this.currentStepIndex].id === 8) {
      this.changeBtn("Verzenden");
      this.handleProductMijnReservation();
      this.completeResume(this.formData);
    } else this.changeBtn("Volgende");
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

  showFormForStep(stepIndex) {
    this.hideAllForms();

    const form = document.querySelector(
      `.form-step[data-step-id="${this.steps[stepIndex].id}"]`
    );
    if (form) {
      form.classList.add("active");
      this.updateNextButtonState();
    }
    this.handleSideEffects(form);
    this.updateProgressBar();
    this.checkIsLastStep();
  }

  handleFormClick(event) {
    const clickedElement = event.target;
    const formStep = clickedElement.closest(".form-step");

    if (formStep) {
      const value = clickedElement.getAttribute(
        this.steps[this.currentStepIndex].attribute
      );

      if (value) {
        this.formData[this.steps[this.currentStepIndex].keyBack] = value;
      }
    }
    this.updateNextButtonState();
  }

  handleFormInput(event) {
    const inputElement = event.target;
    const formStep = inputElement.closest(".form-step");
    const textInputs = formStep.querySelectorAll('input[type="text"]');
    const requiredInputs = Array.from(textInputs).filter(
      (input) => !input.hasAttribute("data-not-required")
    );
    const allInputsHaveValue = requiredInputs.every(
      (input) => input.value.trim() !== ""
    );
    if (!allInputsHaveValue) this.disableButton();
    else this.enableButton();
    const keyBack = inputElement.getAttribute("data-key-back");
    this.formData[keyBack] = inputElement.value;
  }

  isStepInvalid() {
    const typeKey =
      typeof this.formData[this.steps[this.currentStepIndex].keyBack];

    if (typeKey === "object") {
      return (
        this.formData[this.steps[this.currentStepIndex].keyBack].length > 0
      );
    }
    return !!this.formData[this.steps[this.currentStepIndex].keyBack];
  }

  updateNextButtonState() {
    if (!this.isStepInvalid()) this.disableButton();
    else this.enableButton();
  }

  handleSideEffects(form) {
    if (this.currentStepIndex === 3) {
      this.getCities(form);
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
  getTotalSteps() {
    return this.formData.course_type === "offline" ? 7 : 8;
  }

  calculateProgressPercentage() {
    const basePercentage = 15;
    return Math.round(
      basePercentage +
        (this.currentStepIndex / this.getTotalSteps()) * (100 - basePercentage)
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
      this.citiesList = data.filter((city) =>
        city.license_types.includes(this.formData.license_type)
      );
      this.createCities(this.citiesList);
    } catch (error) {
      console.log(error);
    }
  }

  createCities(cities) {
    const idsCities = [];
    const newContainer = document.getElementById("step4");
    this.cleanInterface(newContainer);
    cities.forEach((city) => {
      const divElement = document.createElement("div");
      divElement.className = "aanmelden_step4-checkbox-item";
      divElement.addEventListener("click", () => {
        this.toggleCitySelection(city, divElement, idsCities);
        this.updateNextButtonState();
      });

      const paragraph = document.createElement("p");
      paragraph.className = "text-weight-bold";
      paragraph.textContent = city.name;

      divElement.appendChild(paragraph);
      newContainer.appendChild(divElement);
    });
  }
  toggleCitySelection(city, divElement, idsCities) {
    const cityId = city.id;
    const index = idsCities.indexOf(cityId);

    if (index === -1) {
      idsCities.push(cityId);
      this.citiesNameSelected.push(city.name);
      divElement.classList.add("active");
    } else {
      idsCities.splice(index, 1);
      this.citiesNameSelected.splice(index, 1);
      divElement.classList.remove("active");
    }

    this.setData("cities", idsCities);
  }
  // END CITIES

  // RESUME
  completeResume(formData) {
    console.log(formData);
    this.completeLicenseType("license_type");
    this.completeCourseType("course_type");
    this.completeTypeExam("exam_type");
    this.completeCities();
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
  //END RESUME
}
const steps = [
  { id: 1, keyBack: "license_type", attribute: "data-license-type" },
  { id: 2, keyBack: "course_type", attribute: "data-course-type" },
  { id: 3, keyBack: "exam_type", attribute: "data-exam-type" },
  { id: 4, keyBack: "cities" },
  { id: 5, keyBack: "course_category", attribute: "data-course-category" },
  { id: 6, keyBack: "course_names", attribute: "data-course-name" },
  { id: 7, form: "allInputs" },
  { id: 8, form: "Resume" },
  //{
  //id: 4,
  //possibleSteps: [{ id: 5, keyBack: "cities" }],
  //},
];

const formManager = new FormManager(steps);
formManager.initialize();
