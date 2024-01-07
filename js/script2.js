class FormManager {
  constructor(steps) {
    this.steps = steps;
    this.currentStepIndex = 0;
    this.formData = {};
    this.nextButton = document.getElementById("nextButton");
    this.prevButton = document.getElementById("prevButton");
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
  }

  initialize() {
    this.nextButton.addEventListener("click", () => this.nextStep());
    this.prevButton.addEventListener("click", () => this.prevStep());
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

  cleanInterface(element) {
    element.innerHTML = "";
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
      this.attachClickEvent(form);
      this.updateNextButtonState();
    }
    this.handleSideEffects(form);
    this.updateProgressBar();
    console.log(this.getData());
  }

  attachClickEvent(form) {
    const clickableElements = form.querySelectorAll("div");

    clickableElements.forEach((element) => {
      element.addEventListener("click", () => {
        const value = element.getAttribute(
          this.steps[this.currentStepIndex].attribute
        );
        this.formData[this.steps[this.currentStepIndex].keyBack] = value;
        this.updateNextButtonState();
      });
    });
  }

  isStepInvalid() {
    const typeKey =
      typeof this.formData[this.steps[this.currentStepIndex].keyBack];

    if (typeKey === "object") {
      return (
        this.formData[this.steps[this.currentStepIndex].keyBack].length > 0
      );
    }

    return this.formData[this.steps[this.currentStepIndex].keyBack];
  }

  updateNextButtonState() {
    this.nextButton.disabled = !this.isStepInvalid();
  }

  handleSideEffects(form) {
    if (this.currentStepIndex === 3) {
      //this.handleProductMijnReservation();
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
    const progressBar = document.getElementById("progress-bar");
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
  async getCities(form) {
    try {
      const resServer = await fetch(
        "https://api.develop.nutheorie.be/api/cities/"
      );
      const data = await resServer.json();
      this.citiesList = data.filter((city) =>
        city.license_types.includes(this.formData.license_type)
      );
      this.createCities(this.citiesList, form);
      console.log(this.citiesList);
    } catch (error) {
      console.log(error);
    }
  }

  createCities(cities, container) {
    const idsCities = [];
    this.cleanInterface(container);
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
      container.appendChild(divElement);
    });
  }
  toggleCitySelection(city, divElement, idsCities) {
    const cityId = city.id;
    const index = idsCities.indexOf(cityId);

    if (index === -1) {
      idsCities.push(cityId);
      divElement.classList.add("active");
    } else {
      idsCities.splice(index, 1);
      divElement.classList.remove("active");
    }

    this.setData("cities", idsCities);
  }
  // END
}
const steps = [
  { id: 1, keyBack: "license_type", attribute: "data-license-type" },
  { id: 2, keyBack: "course_type", attribute: "data-course-type" },
  { id: 3, keyBack: "exam_type", attribute: "data-exam-type" },
  { id: 4, keyBack: "cities" },
  //{
  //id: 4,
  //possibleSteps: [{ id: 5, keyBack: "cities" }],
  //},
];

const formManager = new FormManager(steps);
formManager.initialize();
