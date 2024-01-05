class FormHandler {
  constructor() {
    this.steps = document.querySelectorAll(".step");
    this.btnNext = document.getElementById("btn-next");
    this.btnPrevious = document.getElementById("btn-prev");
    this.current = 0;
    this.collectedData = {};

    this.bindEvents();
    this.bindData();
  }

  showCurrentStep() {
    this.steps.forEach((step, index) => {
      if (index === this.current) {
        step.classList.add("active");
      } else {
        step.classList.remove("active");
      }
    });
  }

  nextStep() {
    if (this.current < this.steps.length - 1) {
      this.current = this.current + 1;
      this.showCurrentStep();
      this.bindData();
    } else {
      this.collectedData = this.getData();
      //this.enviarDatosAlBackend(this.collectedData);
    }
  }

  previousStep() {
    console.log(this.current);
    if (this.current > 0) {
      this.current = this.current - 1;
      this.showCurrentStep();
      this.bindData();
    }
  }

  handleStepChange(direction) {
    if (direction === "next") {
      this.nextStep();
    } else {
      this.previousStep();
    }

    this.btnPrevious.disabled = this.current === 0;
  }

  getData() {
    return this.collectedData;
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
          this.collectedData[propiedadObjeto] = valor;
        }
      }.bind(this)
    );
  }

  bindData() {
    if (this.current === 0) {
      this.configurarEventoClick.call(
        this,
        "step1",
        "data-license-type",
        "license_type"
      );
    }

    if (this.current === 1) {
      this.configurarEventoClick.call(
        this,
        "step2",
        "data-course-type",
        "course_type"
      );
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
