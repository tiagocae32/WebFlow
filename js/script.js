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

    this.bindEvents();
    this.bindData();
  }

  showcurrentStepStep() {
    this.steps.forEach((step, index) => {
      if (index === this.currentStep) {
        step.classList.add("active");
      } else {
        step.classList.remove("active");
      }
    });
  }

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep = this.currentStep + 1;
      this.showcurrentStepStep();
      this.bindData();
    } else {
      this.formData = this.getData();
      console.log(this.formData);
      //this.enviarDatosAlBackend(this.formData);
    }
  }

  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep = this.currentStep - 1;
      this.showcurrentStepStep();
      this.bindData();
    }
  }

  handleStepChange(direction) {
    if (direction === "next") {
      this.nextStep();
    } else {
      this.previousStep();
    }

    this.btnPrevious.disabled = this.currentStep === 0;
  }

  getData() {
    return this.formData;
  }

  disableButton() {
    this.btnNext.disabled = true;
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

  configurarEventoClick(contenedorId, atributoDatos, propiedadObjeto) {
    let contenedor = document.getElementById(contenedorId);

    contenedor.addEventListener(
      "click",
      function (event) {
        let elemento = event.target.closest(`[${atributoDatos}]`);

        if (elemento) {
          let valor = elemento.getAttribute(atributoDatos);
          this.formData[propiedadObjeto] = valor;

          if (this.currentStep === 2) {
            const product = this.getProduct();
            const is_mijn_reservation = this.is_mijn_reservation();
            this.formData.product = product;
            this.formData.is_mijn_reservation = is_mijn_reservation;
          }
        }
      }.bind(this)
    );
  }

  async bindData() {
    if (this.currentStep === 0) {
      this.configurarEventoClick.call(
        this,
        "step1",
        "data-license-type",
        "license_type"
      );
    }

    if (this.currentStep === 1) {
      this.configurarEventoClick.call(
        this,
        "step2",
        "data-course-type",
        "course_type"
      );
    }

    if (this.currentStep === 2) {
      this.configurarEventoClick.call(
        this,
        "step3",
        "data-exam-type",
        "exam_type"
      );
    }
    console.log(this.currentStep);

    if (this.currentStep === 3) {
      this.loadCities();
    }
  }

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

  is_mijn_reservation() {
    return this.formData.exam_type === 3;
  }

  /////

  // Step 4
  async loadCities() {
    const cities = await this.getCities();
    this.citiesList = cities.filter((city) =>
      city.license_types.includes(this.formData.license_type)
    );
    let contenedor = document.getElementById("step4");
    contenedor.innerHTML = "";

    for (let i = 0; i < this.citiesList.length; i++) {
      let objeto = this.citiesList[i];
      let parrafo = document.createElement("p");
      parrafo.textContent = "Nombre: " + objeto.name;
      contenedor.appendChild(parrafo);
    }
  }

  /// Step 5

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
