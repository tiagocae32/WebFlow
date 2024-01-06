class FormManager {
  constructor(steps) {
    this.steps = steps;
    this.currentStepIndex = 0;
    this.formData = {};
    this.totalSteps;
    this.nextButton = document.getElementById("nextButton");
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
  }

  attachClickEvent(form) {
    const clickableElements = form.querySelectorAll("div");

    clickableElements.forEach((element) => {
      element.addEventListener("click", () => {
        const value = element.getAttribute(
          this.steps[this.currentStepIndex].attribute
        );
        this.formData[this.steps[this.currentStepIndex].keyBack] = value;
        console.log(this.formData);
        this.updateNextButtonState();
      });
    });
  }

  isStepInvalid() {
    return this.formData[this.steps[this.currentStepIndex].keyBack];
  }

  updateNextButtonState() {
    this.nextButton.disabled = !this.isStepInvalid();
  }

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

  initialize() {
    const nextButton = document.getElementById("nextButton");
    const prevButton = document.getElementById("prevButton");

    nextButton.addEventListener("click", () => this.nextStep());
    prevButton.addEventListener("click", () => this.prevStep());

    this.showFormForStep(this.currentStepIndex);
  }
}

const steps = [
  { id: 1, keyBack: "license_type", attribute: "data-license-type" },
  { id: 2, keyBack: "course_type", attribute: "data-course-type" },
  { id: 3, keyBack: "exam_type", attribute: "data-exam-type" },
  {
    id: 4,
    possibleSteps: [{ id: 5, keyBack: "cities" }],
  },
];

const formManager = new FormManager(steps);
formManager.initialize();
