class FormHandler {
  constructor() {
    this.steps = document.querySelectorAll(".step");
    this.btnNext = document.getElementById("btn-next");
    this.btnPrevious = document.getElementById("btn-prev");
    this.currentStep = 0;
    this.formData = {};
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

    // Step 5
    this.citiesList = [];

    this.nextButton = document.getElementById("btn-next");

    this.bindEvents();
    this.bindData();
  }

  // Step 2

  handleStep2() {
    const product = this.getProduct();
    const isMijnReservation = this.isMijnReservation();
    this.formData.product = product;
    this.formData.is_mijn_reservation = isMijnReservation;
  }

  ///

  // Step 3

  getProduct() {
    this.formData.exam_type = Number(this.formData.exam_type);

    const licenseType = this.formData.license_type;
    const examType = this.formData.exam_type;

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

  isMijnReservation() {
    return this.formData.exam_type === 3;
  }

  /////

  // Step 4
  async loadCities() {
    const cities = await this.getCities();
    this.citiesList = cities.filter((city) =>
      city.license_types.includes(this.formData.license_type)
    );
    const container = document.getElementById("step4");
    this.cleanContainer("step4");

    const idsCities = [];

    this.citiesList.forEach((city) => {
      const divElement = document.createElement("div");
      divElement.className = "aanmelden_step4-checkbox-item";

      divElement.addEventListener("click", () => {
        const cityId = city.id;
        const index = idsCities.indexOf(cityId);

        if (index === -1) {
          idsCities.push(cityId);
          divElement.classList.toggle("active");
        } else {
          idsCities.splice(index, 1);
          divElement.classList.remove("active");
        }
        this.formData.cities = idsCities;
        this.setupStepSpecificLogic(this.currentStep, this.nextButton);
      });

      const paragraph = document.createElement("p");
      paragraph.className = "text-weight-bold";
      paragraph.textContent = `${city.name}`;

      divElement.appendChild(paragraph);
      container.appendChild(divElement);
    });
  }

  async getCities() {
    try {
      const resServer = await fetch(
        "https://api.develop.nutheorie.be/api/cities/"
      );
      return await resServer.json();
    } catch (error) {
      console.log(error);
    }
  }

  loadCbrLocationsPage() {}

  cleanContainer(contenedor) {
    document.getElementById(contenedor).innerHTML = "";
  }

  ///

  /// Step 5

  // COURSE-CATEGORIES

  ////

  // General

  calculateProgressPercentage() {
    const basePercentage = 15;
    return Math.round(
      basePercentage + (this.currentStep / 8) * (100 - basePercentage)
    );
  }

  updateProgressBar() {
    const progressBar = document.getElementById("progress-bar");
    const percentage = this.calculateProgressPercentage();
    progressBar.style.width = `${percentage}%`;
  }

  showCurrentStep() {
    this.steps.forEach((step, index) => {
      step.classList.toggle("active", index === this.currentStep);
    });
    this.setupStepSpecificLogic(this.currentStep, this.nextButton);
  }

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep = this.currentStep + 1;
      this.showCurrentStep();
      this.bindData();
    } else {
      this.formData = this.getData();
      console.log(this.formData);
      //this.enviarDatosAlBackend(this.formData);
    }
    this.updateProgressBar();
  }

  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep = this.currentStep - 1;
      this.showCurrentStep("back");
      this.bindData();
    }
    this.updateProgressBar();
  }

  handleStepChange(direction) {
    if (direction === "next") {
      this.nextStep();
    } else {
      this.previousStep();
    }

    this.btnPrevious.classList.toggle(
      "disabled-button",
      this.currentStep === 0
    );
  }

  getData() {
    return this.formData;
  }

  enableButton(button, className) {
    button.classList.remove(className);
  }

  disableButton(button, className) {
    button.classList.add(className);
  }

  bindEvents() {
    if (this.btnNext) {
      this.btnNext.addEventListener("click", () =>
        this.handleStepChange("next")
      );
    }

    if (this.btnPrevious) {
      this.btnPrevious.addEventListener("click", () =>
        this.handleStepChange("previous")
      );
    }
  }

  configureClickEvent(contenedorId, atributoDatos, propiedadObjeto) {
    console.log("oooo");
    let contenedor = document.getElementById(contenedorId);

    contenedor.addEventListener(
      "click",
      function (event) {
        let elemento = event.target.closest(`[${atributoDatos}]`);

        if (elemento) {
          let valor = elemento.getAttribute(atributoDatos);
          this.formData[propiedadObjeto] = valor;

          if (this.currentStep === 2) {
            this.handleStep2();
          }
        }
        console.log(this.currentStep);
        this.setupStepSpecificLogic(this.currentStep, this.nextButton);
      }.bind(this)
    );
  }

  async bindData() {
    switch (this.currentStep) {
      case 0:
        this.configureClickEvent("step1", "data-license-type", "license_type");
        break;

      case 1:
        this.configureClickEvent("step2", "data-course-type", "course_type");
        break;

      case 2:
        this.configureClickEvent("step3", "data-exam-type", "exam_type");
        break;

      case 3:
        if (
          Number(this.formData.exam_type === 1) ||
          Number(this.formData.exam_type === 2)
        ) {
          this.loadCities();
        } else {
          this.cleanContainer("step4");
          this.loadCbrLocationsPage();
        }
        break;
      case 4:
        this.configureClickEvent(
          "step5",
          "data-course-category",
          "course_category"
        );
        break;
    }
  }

  setupStepSpecificLogic(step, button) {
    const fieldNames = [
      "license_type",
      "course_type",
      "exam_type",
      "cities",
      "course_category",
    ];
    const fieldName = fieldNames[step];

    const isFieldValid =
      fieldName === "cities"
        ? this.formData[fieldName] && this.formData[fieldName].length > 0
        : !!this.formData[fieldName];

    isFieldValid
      ? this.enableButton(button, "disabled-button")
      : this.disableButton(button, "disabled-button");
  }

  enviarDatosAlBackend(datos) {
    const url = "https://tu-backend.com/api";

    const opciones = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datos),
    };

    fetch(url, opciones)
      .then((response) => response.json())
      .then((data) => {
        console.log("Respuesta del backend:", data);
      })
      .catch((error) => {
        console.error("Error al enviar datos al backend:", error);
      });
  }
}

const formHandler = new FormHandler();
