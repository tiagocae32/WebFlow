const urlDevelop = "https://api.develop.nutheorie.be/";
const urlProd = "https://api.nutheorie.nl/";
const apiBaseUrls = {
  "www.develop.nutheorie.be": urlDevelop,
  "www.nutheorie.nl": urlProd,
  "webflow.nutheorie.nl": urlProd,
  "webflow.nutheorie.be": urlDevelop,
};
const dutchMonths = [
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

// Repeat functions
const getLastDayOfMonth = function () {
  const now = new Date();
  const lastDayOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const currentMonthInDutch = dutchMonths[now.getMonth()];

  return `${lastDayOfMonth} ${currentMonthInDutch}`;
};

const processDescriptionItems = function (descriptionItems) {
  return descriptionItems.map((item) => {
    if (typeof item.description === "string") {
      return {
        ...item,
        description: item.description.replace(
          "{{ getLastDayOfMonth }}",
          getLastDayOfMonth()
        ),
      };
    }
    return item;
  });
};

const updateSvgVisibility = function (formData) {
  const licenseType = formData.license_type;
  const licenseTypes = ["auto", "scooter", "motor"];

  licenseTypes.forEach((type) => {
    const svgElement = document.getElementById(`${type}Svg`);

    if (svgElement) {
      if (type === licenseType) {
        svgElement.classList.remove("hide");
      } else {
        svgElement.classList.add("hide");
      }
    }
  });
};

// End repeat functions

class GA {
  static instance = null;

  constructor() {
    if (GA.instance) {
      throw new Error("No puedes crear otra instancia de GA.");
    }
    this.cart = {
      name: "",
      id: "",
      price: "",
      category: "",
      variant: "",
    };
    this.currencyCode = "EUR";
    this.initEcommerce();
  }

  static getInstance() {
    if (!GA.instance) {
      GA.instance = new GA();
    }
    return GA.instance;
  }
  // Init ecommerce object //
  initEcommerce() {
    window.dataLayer = window.dataLayer || [];

    dataLayer.push({
      event: "init",
      cart: this.cart,
    });
  }

  // Clear the previous ecommerce object //
  resetEcommerce() {
    if (!window.dataLayer) return;
    try {
      dataLayer.push({ ecommerce: null });
    } catch (e) {
      console.log(e);
    }
  }

  // Update cart item details //
  updateCartItem(data) {
    this.cart = { ...this.cart, ...data };
  }

  // Send event to analytics //
  sendEvent(
    category,
    action,
    eventLabel,
    eventValue = undefined,
    additionalParams = {}
  ) {
    let label = eventLabel;
    if (eventValue) label = eventLabel + "-" + eventValue;
    if (!window.dataLayer) return;

    try {
      dataLayer.push({
        event: "GAEvent",
        eventCategory: category,
        eventAction: action,
        eventLabel: label,
        ...additionalParams,
      });
    } catch (e) {
      console.log(e);
    }
  }

  // Send event to analytics //
  event(eventName, data) {
    if (!window.dataLayer) return;

    try {
      console.log("pushed", data);
      dataLayer.push({
        event: eventName,
        ...data,
      });
    } catch (e) {
      console.log(e);
    }
  }

  // Add item to datalayer object //
  async addToCart(data) {
    this.updateCartItem(data);

    try {
      dataLayer.push({
        event: "addToCart",
        ecommerce: {
          currencyCode: this.currencyCode,
          add: {
            products: [
              {
                name: this.cart.name,
                id: this.cart.id,
                price: this.cart.price,
                category: this.cart.category,
                variant: this.cart.variant,
                quantity: 1,
              },
            ],
          },
        },
      });
    } catch (e) {
      console.log(e);
    }
  }

  // Change item properties in datalayer object //
  changeItem(step, data) {
    this.updateCartItem(data);

    try {
      dataLayer.push({
        event: "checkout",
        ecommerce: {
          currencyCode: this.currencyCode,
          checkout: {
            actionField: { step: step },
            products: [
              {
                name: this.cart.name,
                id: this.cart.id,
                price: this.cart.price,
                category: this.cart.category,
                variant: this.cart.variant,
                quantity: 1,
              },
            ],
          },
        },
      });
    } catch (e) {
      console.log(e);
    }
  }

  // Send payment method //
  checkoutItem(payment) {
    try {
      dataLayer.push({
        event: "checkoutOption",
        ecommerce: {
          checkout_option: {
            actionField: { step: 6, option: payment },
          },
        },
      });
    } catch (e) {
      console.log(e);
    }
  }
}

class Authentication {
  static instance = null;
  constructor() {
    if (Authentication.instance) {
      throw new Error("No puedes crear otra instancia de Authentication.");
    }
    this.expAccessToken = null;
  }

  static getInstance() {
    if (!Authentication.instance) {
      Authentication.instance = new Authentication();
    }
    return Authentication.instance;
  }

  checkToken() {
    const token = this.getCookiesToken();
    return !!token && !!token.access;
  }

  async preloadUserApplicationData() {
    let userData;
    const token = await this.checkAndRefreshToken();
    if (token && token.access) {
      const userDataLoaded = await this.getUserInfoBack();
      if (userDataLoaded && userDataLoaded.email) {
        userData = userDataLoaded;
      }
    }
    return userData ?? {};
  }

  async checkAndRefreshToken() {
    const currentToken = this.getCookiesToken();
    if (!currentToken || !currentToken.access) {
      return null;
    }
    const now = new Date();
    if (now.getTime() >= this.expAccessToken * 1000) {
      await this.refreshToken();
      const newToken = this.getCookiesToken();
      return newToken;
    }
    return currentToken;
  }

  async refreshToken() {
    const oldToken = this.getCookiesToken();

    let apiBaseUrl = apiBaseUrls[window.location.hostname] || urlProd;
    if (oldToken && oldToken.refresh) {
      try {
        const respuesta = await fetch(
          `${apiBaseUrl}authorization/token/refresh/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh: oldToken.refresh }),
          }
        );
        const data = await respuesta.json();
        const encodedTokens = encodeURIComponent(JSON.stringify(data));
        document.cookie = `tokens=${encodedTokens}`;
        if (data && data.exp_access) {
          this.expAccessToken = data.exp_access;
        }
      } catch (error) {
        console.log("Error refreshtoken");
      }
    }
  }

  getCookiesToken() {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const partes = cookie.split("=");
      if (partes[0].trim() === "tokens") {
        const encodedTokens = partes[1];
        try {
          const decodedTokens = decodeURIComponent(encodedTokens);
          const tokens = JSON.parse(decodedTokens);
          return tokens;
        } catch (error) {
          console.error("Error al decodificar la cookie tokens:", error);
          return null;
        }
      }
    }
    return null;
  }

  async getUserInfoBack() {
    const accessToken = this.getCookiesToken();
    if (accessToken) {
      this.expAccessToken = accessToken.exp_access;
      try {
        const baseUrl = apiBaseUrls[window.location.hostname] || urlProd;
        const userInfoUrl = `${baseUrl}api/applications/`;
        const resServer = await fetch(userInfoUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken.access}`,
            "Content-Type": "application/json",
          },
        });
        const userData = await resServer.json();
        return userData;
      } catch (error) {
        console.log(error);
      }
    } else {
      return {};
    }
  }
}

if (window.location.pathname.includes("/aanmelden")) {
  class FormManager {
    constructor(steps) {
      this.instanceToken = Authentication.getInstance();
      this.instanceGA = GA.getInstance();
      this.userData = {};
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
      this.initAPIUrlVariables();
      this.PLANS_DELTA = 29;
      this.REAPPLY_PLANS_DELTA = 19;
      // Google Analytics init
      this.preSavedForAnalyticsData = {};
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
      this.CHANCES_TYPES = {
        LOWER: "klein",
        AVERAGE_LOW: "klein-gemiddeld",
        AVERAGE: "gemiddeld",
        AVERAGE_BIG: "gemiddeld-groot",
        BIG: "groot",
      };
      this.courseChancesMapping = {
        online: {
          "Binnen een maand": this.CHANCES_TYPES.AVERAGE_BIG,
          "Binnen 1.5 maand": this.CHANCES_TYPES.BIG,
          "Binnen 2 maanden": this.CHANCES_TYPES.BIG,
        },
        offline: {
          "Binnen een maand": this.CHANCES_TYPES.AVERAGE,
          "Binnen 1.5 maand": this.CHANCES_TYPES.AVERAGE_BIG,
          "Binnen 2 maanden": this.CHANCES_TYPES.BIG,
        },
        reapply: {
          "Binnen 15 dagen": this.CHANCES_TYPES.AVERAGE_BIG,
          "Binnen een maand": this.CHANCES_TYPES.AVERAGE_BIG,
          "Binnen 1.5 maand": this.CHANCES_TYPES.BIG,
        },
      };
      this.zoSnelOptions = [
        "Binnen 15 dagen",
        "Binnen een maand",
        "Binnen 1.5 maand",
        "Binnen 2 maanden",
      ];
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
      this.preferred_date_option = {
        per_dates: "zo snel mogelijk",
        per_month: "maand",
        calendar: "specifieke datums",
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

    initAPIUrlVariables() {
      let apiBaseUrl = apiBaseUrls[window.location.hostname] ?? urlProd;

      this.urls = {
        cities: `${apiBaseUrl}api/cities/`,
        cbrsLocations: `${apiBaseUrl}api/applications/exam_locations/`,
        plans: `${apiBaseUrl}api/applications/online_plans/`,
        urlPostMultiStepForm: `${apiBaseUrl}api/applications/`,
      };
    }

    // Google Analytics

    pushStepToDataLayer(currentStepNumber, eventData) {
      let data = {
        ...this.preSavedForAnalyticsData,
        event: "signup_funnel_step",
        funnel_step_number: currentStepNumber,
      };
      if (eventData.license_type) {
        //s1
        const licenseTypeFound =
          this.LicenseTypesEnum[eventData.license_type.toUpperCase()];
        if (licenseTypeFound) {
          data.license_type = `${licenseTypeFound}theorie`;
        }
      }
      if (eventData.course_type) {
        data.course_type = this.convertCourseType();
      }
      if (eventData.exam_type) {
        //s3
        data.exam_type = this.convertExamType();
      }

      if (eventData.cities) {
        //s4
        data.course_location = this.parseCityNames(eventData.cities).join(", ");
      }
      if (eventData.cbr_locations) {
        //s4 online
        data.course_location = eventData.cbr_locations.join(", ");
      }
      if (eventData.course_category) {
        //s5
        const courseCategoryFound =
          this.preferred_date_option[eventData.course_category];
        if (courseCategoryFound) {
          data.preferred_date_option = courseCategoryFound;
        }
      }
      if (eventData.course_names) {
        //s6
        data.preferred_date_time = Array.isArray(eventData.course_names)
          ? eventData.course_names.join(", ")
          : eventData.course_names;
      }
      if (eventData.course_dates) {
        //s6
        const formattedDates = Array.from(this.selectedDates).map((date) => {
          return date.replace(/-/g, "");
        });
        data.preferred_date_time = formattedDates.join(", ");
      }

      if (eventData.mijn_exam_location) {
        // online/location -self reserve s4
        data.cbr_location = eventData.mijn_exam_location;
      }

      if (eventData.mijn_exam_datetime) {
        // online/location -self reserve s4
        const [datePart, timePartWithZone] = eventData.mijn_exam_datetime.split('T');
        const [year, month, day] = datePart.split('-').map(num => String(num).padStart(2, '0'));
        const [timePart] = timePartWithZone.split('+');
        let [hours, minutes] = timePart.split(':');

        hours = hours.padStart(2, '0');
        minutes = minutes.padStart(2, '0');

        data.cbr_date_time = `${day}${month}${year} - ${hours}:${minutes}`;
      }

      if (eventData.package_name) {
        // online -self reserve s5
        data.package_name = eventData.package_name;
        data.package_price = parseFloat(Number(this.packagePrice).toFixed(2));
      }

      if (eventData.email) {
        // Usa CryptoJS para calcular el hash SHA-256 del email
        data.sha_256_email = CryptoJS.SHA256(eventData.email).toString(
          CryptoJS.enc.Hex
        );
      }

      this.preSavedForAnalyticsData = { ...data };

      Object.keys(data).forEach((key) => {
        const val =
          typeof data[key] === "number" ? data[key].toString() : data[key];
        if (typeof val === "string") {
          data[key] = val.toLowerCase();
        }
      });
      console.log(data);

      this.instanceGA.event(data.event, data); // send event after every step finished
    }

    executeGAOne(currentStepId) {
      const currentStepData = this.getCurrentStepData(currentStepId);

      const keysToPush = currentStepData.keysBack ?? [
        currentStepData.keyBack ?? currentStepData.keyGA,
      ];

      keysToPush.forEach((key) => {
        this.pushStepToDataLayer(this.currentStepNumber, {
          [key]: this.formData[key],
        });
      });

      if (currentStepData.keysDataLayerGA) {
        currentStepData.keysDataLayerGA.forEach((key) => {
          dataLayer.push({ [key]: this.formData[key] });
        });
      }
    }
    executeGATwo(currentStepId) {
      if (currentStepId === "step2") {
        this.pushCourseTypeDataLayer();
      }

      if (currentStepId === "step3") {
        this.instanceGA.changeItem(2, { category: this.getExamType() });
        this.instanceGA.event("examType", { exam_type: this.getExamType() });
      }

      if (currentStepId === "step4Cities") {
        this.instanceGA.event("locationsByCity", {
          locations_by_city: this.formData.cities,
        });
      }

      if (currentStepId === "step4Cbr") {
        this.instanceGA.event("locationsByCbr", {
          locations_by_cbr: this.formData.cbr_locations,
        });
      }

      if (currentStepId === "step5") {
        this.instanceGA.event("courseCategory", {
          course_category: this.formData.course_category,
        });
      }
      if (currentStepId === "stepOnlinePackage") {
        this.instanceGA.changeItem(this.currentStepNumber, {
          variant: this.formData.package_name,
          price: this.packagePrice,
        });
      }
    }

    // Push to Data Layer GA course type events
    pushCourseTypeDataLayer() {
      this.instanceGA.resetEcommerce();
      this.instanceGA.event("courseType", {
        course_type: this.formData.course_type,
      });
      this.instanceGA.addToCart({
        name: this.formData.course_type,
        id: this.getCourseTypeID(),
      });
      this.instanceGA.changeItem(1, {
        name: this.formData.course_type,
        id: this.getCourseTypeID(),
      });
    }

    // Convert text for key course_type (GA)
    convertCourseType() {
      const courseTypeMap = {
        offline: "theoriecursus op locatie",
        online: "online theoriecursus",
      };

      return (
        courseTypeMap[this.formData.course_type] ?? this.formData.course_type
      );
    }

    // Convert text for key exam_type (GA)
    convertExamType() {
      const examTypeMap = {
        1: "standaard examen",
        2: "verlengd examen",
        3: "zelf al examen gereserveerd",
      };
      return (
        examTypeMap[Number(this.formData.exam_type)] ?? this.formData.exam_type
      );
    }

    getCourseTypeID() {
      return this.formData["course_type"] === "offline" ? 0 : 1;
    }

    getExamType() {
      let _type = this.PRODUCTS_LIST.BTH;
      const examType = Number(this.formData.exam_type);
      if (examType === 3) {
        _type = this.PRODUCTS_LIST.MIJN;
      } else {
        if (
          this.formData &&
          this.formData.license_type === this.LicenseTypesEnum.MOTOR
        ) {
          if (examType === 1) _type = this.PRODUCTS_LIST.ATH;
          if (examType === 2) _type = this.PRODUCTS_LIST.ATH_VE;
        } else if (
          this.formData &&
          this.formData.license_type === this.LicenseTypesEnum.SCOOTER
        ) {
          if (examType === 1) _type = this.PRODUCTS_LIST.AMTH;
          if (examType === 2) _type = this.PRODUCTS_LIST.AMTH_VE;
        } else {
          if (examType === 1) _type = this.PRODUCTS_LIST.BTH;
          if (examType === 2) _type = this.PRODUCTS_LIST.BTH_VE;
        }
      }
      return _type;
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
          this.updateStepIndexText(true);
          this.pushStepToDataLayer(1, {
            license_type: this.formData.license_type,
          });
          this.pushStepToDataLayer(2, {
            course_type: this.formData.course_type,
          });
          this.pushCourseTypeDataLayer();
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

      this.executeGAOne(currentStepId);
      this.executeGATwo(currentStepId);

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
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (this.stepHistory.length > 1) {
        this.stepHistory.pop();
        const previousStepId = this.stepHistory[this.stepHistory.length - 1];

        const prevStepIndex = this.steps.findIndex(
          (step) => step.id === previousStepId
        );
        if (prevStepIndex > -1) {
          this.currentStepIndex = prevStepIndex;
          this.showFormForStep(this.currentStepIndex);
        }
        this.updateStepIndexText();
      }
    }

    getCurrentStepId() {
      return this.stepHistory[this.stepHistory.length - 1];
    }

    getCurrentStepData(currentStepId) {
      const stepData = this.steps.find((step) => step.id === currentStepId);
      return stepData;
    }

    getNextStepId(currentStepId) {
      const currentStepData = this.getCurrentStepData(currentStepId);
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
      this.btnEditSave.classList.remove("disabled-button");
    }
    disableButton() {
      this.nextButton.classList.add("disabled-button");
      this.btnEditSave.classList.add("disabled-button");
    }

    isLastStep() {
      return this.getCurrentStepId() === "overzicht";
    }

    checkChanceKey() {
      const isMijn = this.isMijnReservation();
      if (isMijn) {
        delete this.formData["chance"];
      }
    }

    applyLastStepChanges() {
      this.enableButton();
      this.convertDate();
      this.checkChanceKey();
      this.handleProductMijnReservation();
      this.applySubmissionRules();
      this.checkCityOnline();
      this.checkMijn();
      this.completeResume();
    }

    checkMijn() {
      if (this.isMijnReservation()) {
        this.formData["course_names"] = this.formData["course_dates"] = [];
        if (this.formData["course_type"] === "offline") {
          this.formData["cities"] = [];
        }
      }
    }

    async checkCityOnline() {
      if (this.formData["course_type"] === "online") {
        this.formData["cities"] = [53];
        this.idOnline = 53;
      } else {
        if (this.idOnline) {
          const indexDelete = this.formData["cities"].findIndex(
            (city) => city === this.idOnline
          );
          if (indexDelete > -1) this.formData["cities"].splice(indexDelete, 1);
        }
      }
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
      this.handleSpecificStep();
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
      const inputsFormStep = clickedElement.closest(".form-step");

      if (inputsFormStep) {
        const { keyBack, attribute, keyArray } =
          this.steps[this.currentStepIndex];
        const value = clickedElement.getAttribute(attribute);

        if (value) {
          this.formData[keyBack] = keyArray ? [value] : value;
        }
      }
      this.checkEnableNextButton();

      if (this.getCurrentStepId() === "step6")
        this.handleFormClickStepSix(clickedElement, inputsFormStep);
    }

    handleFormClickStepSix(clickedElement, inputsFormStep) {
      if (inputsFormStep) {
        const selectedOptions =
          inputsFormStep.querySelectorAll(".selected-option");

        selectedOptions.forEach((element) => {
          element.classList.remove("selected-option");
        });

        clickedElement.classList.add("selected-option");

        const value = this.isReapplyFlow
          ? this.getCardReapplyChance()
          : this.getCardChance();
        this.formData["chance"] = value;
      }
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

    updateStepIndexText(add = false) {
      let currentStepNumber = add
        ? this.stepHistory.length + 1
        : this.stepHistory.length;

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
      this.currentStepNumber = currentStepNumber;
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
      return Number(this.formData.exam_type) === 3;
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

    checkSelectedDate() {
      if (this.formData["course_names"]) {
        const [valueFormData] = this.formData["course_names"];
        const courseElements = document.querySelectorAll("[data-course-name]");

        courseElements.forEach((element) => {
          const courseName = element.getAttribute("data-course-name");

          if (courseName === valueFormData) {
            element.classList.add("selected-option");
          } else {
            element.classList.remove("selected-option");
          }
        });
      }
    }

    removeCourseNameKey() {
      const options =
        this.getCurrentStepId() === "step6"
          ? this.generateDutchMonths(6)
          : this.zoSnelOptions;

      if (options.some((opt) => this.formData["course_names"]?.includes(opt))) {
        this.formData["course_names"] = [];
      }
    }

    getCardChance() {
      const courseType =
        this.formData["course_type"] === "online" ? "online" : "offline";
      const value = this.formData["course_names"]?.[0] ?? "";
      return this.courseChancesMapping[courseType][value];
    }

    getCardReapplyChance() {
      const value = this.formData["course_names"]?.[0] ?? "";
      return this.courseChancesMapping["reapply"][value];
    }

    // Check if is reapply flow
    checkIsReapplyFlow() {
      const url = new URL(window.location.href);
      this.isReapplyFlow = this.userData.is_reapply_allowed;

      if (this.isReapplyFlow) {
        const planID =
          url.searchParams.get("planId") ?? url.searchParams.get("planID");
        this.planID = planID ? Number(planID) : null;
      }
    }

    async getUserInfo() {
      this.userData = await this.instanceToken.preloadUserApplicationData();
      this.checkIsReapplyFlow();
    }

    initializeFormDataCities() {
      if (this.formData.course_type === "offline") {
        if (!this.formData.cities) {
          this.formData.cities = [];
        }
      }
    }

    handleSpecificStep() {
      const currentStepId = this.getCurrentStepId();
      switch (currentStepId) {
        case "step1":
          this.getUserInfo();
          break;
        case "step4Cities":
          this.getCities();
          this.removeOnlineCity();
          break;
        case "step4Cbr":
          this.getCbrLocations();
          break;
        case "stepOnlinePackage":
          this.getPackages();
          break;
        case "step4Mijn":
          this.initializeFormDataCities();
          this.getCbrLocations(false);
          this.setDateInput();
          this.setTimeInput();
          break;
        case "step6":
          this.showDates();
          this.checkSelectedDate();
          this.removeCourseNameKey();
          break;
        case "stepMonths":
          this.removeCourseNameKey();
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

    // GET/SET DATA
    getFormData() {
      return this.formData;
    }

    getFormDataKey(key) {
      return this.formData[key];
    }

    setFormData(key, value) {
      this.formData[key] = value;
    }

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

    removeOnlineCity() {
      if (
        this.formData.course_type === "offline" &&
        Array.isArray(this.formData.cities)
      ) {
        const indexCityOnline = this.formData.cities.findIndex(
          (city) => city.is_online
        );
        if (indexCityOnline > -1) {
          this.formData.cities.splice(indexCityOnline, 1);
        }
      }
    }

    // MONTHS
    generateDutchMonths(months) {
      const currentMonth = new Date().getMonth();
      const monthsToShow = dutchMonths.slice(
        currentMonth,
        currentMonth + months
      );

      return monthsToShow.map((month) => month);
    }

    handleStepMonths() {
      const months = this.generateDutchMonths(6);
      this.createOptions(months, "stepMonthsList", false);
      this.checkChanceText();
    }

    handleTextChanceMonths() {
      const minLength = 1;
      const data = this.formData["course_names"];
      if (!data || data.length === 0) return "- (selecteer data)";
      if (data.length > minLength) return this.CHANCES_TYPES.AVERAGE_BIG;
      else {
        const currentMonth = new Date().getMonth();
        const [selectedMonth] = data;
        const selectedMonthIndex = dutchMonths.findIndex(
          (month) => month === selectedMonth
        );
        return selectedMonthIndex === currentMonth
          ? this.CHANCES_TYPES.AVERAGE_LOW
          : this.CHANCES_TYPES.AVERAGE_BIG;
      }
    }

    isActualMonth(month) {
      return dutchMonths.indexOf(month) === new Date().getMonth();
    }

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
          if (!isCity) {
            this.checkChanceText();
          }
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

      if (this.zoSnelOptions.some((opt) => this.formData[key]?.includes(opt))) {
        this.formData[key].splice(0, 1);
      }

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

    checkChanceText() {
      const value = this.handleTextChanceMonths();
      document.getElementById("chanceMonths").textContent = value;
      this.formData["chance"] = value;
    }

    // CBR LOCATIONS GET

    async getCbrLocations(createElements = true) {
      if (this.cbrs_list.length === 0) {
        try {
          const resServer = await fetch(this.urls.cbrsLocations);
          const data = await resServer.json();
          this.cbrs_list = data;
        } catch (error) {
          console.log(error);
        }
      }
      if (createElements) {
        this.createCbrElements(this.cbrs_list);
      } else {
        this.formData["cbr_locations"] = [];
        if (!this.isCbrsSelectCreated) {
          this.createCbrsSelect(this.cbrs_list);
          this.isCbrsSelectCreated = true;
        }
      }
    }

    // MIJN STEP

    createCbrsSelect(data) {
      const selectElement = document.getElementById("selectCbrs");

      data = ["Kies CBR examenlocatie", ...data];
      data.forEach((option) => {
        if (option) {
          const optionElement = document.createElement("option");
          optionElement.value = option;
          optionElement.id = option;
          optionElement.text = option;
          selectElement.add(optionElement);
        }
      });
      const tryHideFirstDropdownLink = () => {
        const firstDropdownLink = document.querySelector(".dropdown-link");
        if (firstDropdownLink) {
          firstDropdownLink.style.display = "none";
        } else {
          setTimeout(tryHideFirstDropdownLink, 50);
        }
      };

      tryHideFirstDropdownLink();

      selectElement.addEventListener("change", (event) => {
        const selectedValue = event.target.value;
        this.setFormData("mijn_exam_location", selectedValue);
      });
    }

    setDateInput() {
      const fechaInput = document.getElementById("dateInput");
      const currentDate = new Date();
      currentDate.setHours(12, 0, 0, 0);
      const formattedDate = currentDate.toISOString().split("T")[0];
      fechaInput.min = formattedDate;

      let lastDatePicked = localStorage.getItem("fechaGlobalSeleccionada");
      this.datePicked = lastDatePicked;

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
        this.timePicked = value;

        this.validateTimeInput(value);
        this.formatDateMijnFlow();
      });
    }

    validateTimeInput(value) {
      const isValid =
        value.length === 5 &&
        parseInt(value.substring(0, 2), 10) <= 23 &&
        parseInt(value.substring(3, 5), 10) <= 59;

      if (isValid) {
        document.getElementById("timeError").style.display = "none";
      } else {
        document.getElementById("timeError").style.display = "block";
        this.timePicked = null;
      }
    }

    formatDateMijnFlow() {
      const isTimeValid =
        this.timePicked &&
        this.timePicked.length === 5 &&
        parseInt(this.timePicked.substring(0, 2), 10) <= 23 &&
        parseInt(this.timePicked.substring(3, 5), 10) <= 59;

      if (this.datePicked && isTimeValid) {
        this.setFormData(
          "mijn_exam_datetime",
          `${this.datePicked}T${this.timePicked}:00+01:00`
        );
      } else {
        this.setFormData("mijn_exam_datetime", "");
      }
      this.checkEnableNextButton();
    }

    // CBR step

    createCbrElements(elements) {
      const container = document.getElementById("step4check");

      const createCheckboxElement = (element, index) => {
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
        span.className = "text-weight-bold text-size-small w-form-label";
        span.setAttribute("for", element);
        span.textContent = element;

        label.appendChild(checkboxDiv);
        label.appendChild(checkbox);
        label.appendChild(span);
        itemContainer.appendChild(label);

        container.appendChild(itemContainer);

        checkbox.addEventListener("click", () => {
          this.toggleCbrSelection(element);
          this.checkEnableNextButton();
        });

        return checkboxDiv;
      };

      const updateCheckboxState = (checkbox, element, checkboxDiv) => {
        checkbox.checked = this.formData["cbr_locations"]?.includes(element);
        if (!checkbox.checked) {
          checkboxDiv.classList.remove("w--redirected-checked");
        } else {
          checkboxDiv.classList.add("w--redirected-checked");
        }
      };

      if (!container.hasChildNodes()) {
        this.cleanInterface(container);
        elements.forEach((element, index) => {
          const checkboxDiv = createCheckboxElement(element, index);
          const checkbox = container.querySelector(`input[name="${element}"]`);
          updateCheckboxState(checkbox, element, checkboxDiv);
        });
      } else {
        elements.forEach((element) => {
          const checkbox = container.querySelector(`input[name="${element}"]`);
          if (checkbox) {
            const checkboxDiv =
              checkbox.parentElement.querySelector(".w-checkbox-input");
            updateCheckboxState(checkbox, element, checkboxDiv);
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
      this.monthLabel.textContent = dutchMonths[month];
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
        calendar += `<td class="not-current-month disabled">${previousMonthDays - firstDayAdjusted + i + 1
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
      const value = this.getCalendarChances();
      this.chanceElement.textContent = value;
      this.formData["course_dates"] = [...this.selectedDates].sort(
        (a, b) => new Date(a) - new Date(b)
      );
      this.formData["chance"] = value;
    }

    getCalendarChances() {
      const size = this.selectedDates.size;
      if (!size) return "- (selecteer data)";
      if (this.formData["course_type"] === "online") {
        if (size >= 9) return this.CHANCES_TYPES.BIG;
        else if (size >= 5) return this.CHANCES_TYPES.AVERAGE_BIG;
        else if (size >= 1) return this.CHANCES_TYPES.AVERAGE;
      } else {
        if (size >= 9) return this.CHANCES_TYPES.AVERAGE_BIG;
        else if (size >= 5) return this.CHANCES_TYPES.AVERAGE;
        else if (size >= 1) return this.CHANCES_TYPES.AVERAGE_LOW;
      }
      return this.CHANCES_TYPES.LOWER;
    }

    // PACKAGES

    async getPackages() {
      const url = this.urls.plans;

      try {
        const resServer = await fetch(url);
        const data = await resServer.json();

        const isReapply = this.isReapplyFlow;

        if (data) {
          this.allAvailablePlans = data
            .filter(
              (item) =>
                item.type === (isReapply ? "REAPPLY" : "PUBLIC") &&
                item.license_type === this.formData.license_type &&
                item.is_visible
            )
            .sort((a, b) => a.order - b.order)
            .map(
              ({
                id,
                name,
                description_items,
                is_highlighted,
                available_items,
                price,
                old_price,
                discount_label,
                order,
              }) => {
                const reapplyValue = this.REAPPLY_PLANS_DELTA;
                const nonReapplyValue = this.PLANS_DELTA;

                const modifiedPrice = isReapply
                  ? (price = Number(price) + reapplyValue)
                  : (price = Number(price) + nonReapplyValue);
                const modifiedOldPrice = isReapply
                  ? (old_price = Number(old_price) + reapplyValue)
                  : (old_price = Number(old_price) + nonReapplyValue);

                return {
                  id,
                  name,
                  description_items: processDescriptionItems(description_items),
                  price: modifiedPrice,
                  old_price: modifiedOldPrice,
                  discount_label,
                  order,
                  available_items,
                  is_highlighted,
                };
              }
            );
          this.createPackages(this.allAvailablePlans);
        }
        if (this.isReapplyFlow) {
          this.setReapplyPackage(this.allAvailablePlans);
        }
      } catch (error) {
        console.log(error);
      }
    }

    setReapplyPackage(plans) {
      const plan = plans.find((plan) => plan.id === this.planID);
      if (plan) {
        this.setFormData("package_name", plan.name);

        const packageItems = document.querySelectorAll(
          ".aanmelden_package-item"
        );
        packageItems.forEach((item) => {
          item.classList.remove("selected-option");

          if (item.getAttribute("data-package-id") === String(this.planID)) {
            item.classList.add("selected-option");
          }
        });
        this.checkEnableNextButton();
        this.packageSelected = plan;
      }
    }

    createPackages(packages) {
      const packageListElement = document.getElementById("packageList");

      this.cleanInterface(packageListElement);

      const selectPackage = (packageItem, pkg) => {
        this.packageSelected = pkg;
        this.setFormData("package_name", pkg.name);
        this.packagePrice = pkg.price;

        const allPackageItems = document.querySelectorAll(
          ".aanmelden_package-item"
        );
        allPackageItems.forEach((item) => {
          item.classList.remove("selected-option");
        });

        packageItem.classList.add("selected-option");
      };

      packages.forEach((pkg) => {
        let packageItem = document.createElement("div");
        packageItem.className = "aanmelden_package-item";
        packageItem.setAttribute("data-package-name", pkg.name);
        packageItem.setAttribute("data-package-id", pkg.id);

        if (pkg.is_highlighted) {
          packageItem.classList.add("package_highlight");
        }

        packageItem.addEventListener("click", () => {
          selectPackage(packageItem, pkg);
        });

        if (this.packageSelected && this.packageSelected.id === pkg.id) {
          packageItem.classList.add("selected-option");
        }

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
      if (pkg.is_highlighted) {
        packagePriceElement.classList.add("text-color-pink");
        packagePriceSmallElement.classList.add("text-color-pink");
      }
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

      const hasAvailableItemsDescription = pkg.description_items.some((desc) =>
        desc.description.includes(`${pkg.available_items} CBR oefenexamens`)
      );

      if (!hasAvailableItemsDescription) {
        pkg.description_items = [
          ...pkg.description_items,
          {
            description: `${pkg.available_items} CBR oefenexamens (Na het inloggen kun je eventueel meer oefenexamens bestellen`,
          },
        ];
      }

      pkg.description_items.forEach((desc) => {
        const packageDescriptionItem = this.createElementWithClass(
          "div",
          "aanmelden_package-description"
        );
        this.appendSvgToElement(
          packageDescriptionItem,
          `<svg class="no-shrink" width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
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

    updateRowVisibility() {
      const locationsRow = document.getElementById("locationsRow");
      const datesRow = document.getElementById("datesRow");

      let copyFormDataCities;
      if (this.formData["cities"]) {
        copyFormDataCities = JSON.parse(
          JSON.stringify(this.formData["cities"])
        );
      } else {
        copyFormDataCities = [];
      }
      if (this.formData["course_type"] === "online") {
        copyFormDataCities = [];
      }

      const showLocations =
        (copyFormDataCities && copyFormDataCities.length > 0) ||
        (this.formData["cbr_locations"] &&
          this.formData["cbr_locations"].length > 0);

      const showDates =
        (this.formData["course_names"] &&
          this.formData["course_names"].length > 0) ||
        (this.formData["course_dates"] &&
          this.formData["course_dates"].length > 0);

      if (showLocations) {
        locationsRow.classList.remove("hide");
      } else {
        locationsRow.classList.add("hide");
      }

      if (showDates) {
        datesRow.classList.remove("hide");
      } else {
        datesRow.classList.add("hide");
      }
    }

    // Edit information, go to step

    createEditStepButtons() {
      this.backupFormData();
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
        if (button && !button.initialized) {
          button.addEventListener("click", () => {
            this.isEditing = true;
            buttonData.callback();
            window.scrollTo({ top: 0, behavior: "smooth" });
            this.initializeEditButtons();
            this.showEditButtons();
          });

          // Mark this button as initialized to prevent adding another listener
          button.initialized = true;
        }
        if (buttonData.id === "editOnlinePackages") {
          if (this.formData.course_type === "online") {
            button.classList.remove("hide");
          } else {
            button.classList.add("hide");
          }
        }
      });
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
          console.error("Se ha excedido el lÃ­mite de seguridad en el bucle");
          return;
        }
      }

      this.currentStepIndex = stepIndex;
      this.stepHistory = newStepHistory;
      this.showFormForStep(this.currentStepIndex);
      this.updateStepIndexText();
    }

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
      this.prevPackageSelected = this.packageSelected;

      btnEditCancel.addEventListener("click", () => {
        this.formData = JSON.parse(JSON.stringify(this.originalFormData));
        this.packageSelected = this.prevPackageSelected;
        this.goToStep("overzicht");
        btnEditWrapper.classList.add("hide");
        btnSendWrapper.classList.remove("hide");
        if (this.packageSelected) {
          this.cancelPackage();
        }
      });

      this.btnEditSave.addEventListener("click", () => {
        this.goToStep("overzicht");
        btnEditWrapper.classList.add("hide");
        btnSendWrapper.classList.remove("hide");
      });
    }

    cancelPackage() {
      const allPackageItems = document.querySelectorAll(
        ".aanmelden_package-item"
      );
      allPackageItems.forEach((item) => {
        item.classList.remove("selected-option");
      });
      if (this.prevPackageSelected) {
        const prevSelectedPackageElement = document.querySelector(
          `.aanmelden_package-item[data-package-id="${this.prevPackageSelected.id}"]`
        );
        if (prevSelectedPackageElement) {
          prevSelectedPackageElement.classList.add("selected-option");
        }
      }
    }

    // RESUME

    completeResume() {
      Object.keys(this.resumeConfig).forEach((key) => this.completeField(key));
      this.completeDataInputs();
      updateSvgVisibility(this.formData);
      this.updateRowVisibility();
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

    parseCityNames(sourceData) {
      const selectedCityNames = sourceData.map((cityId) => {
        const city = this.citiesList.find((c) => c.id === cityId);
        return city.name;
      });
      return selectedCityNames;
    }

    completeCities() {
      const container = document.getElementById("citiesColumn");
      if (this.formData["course_type"] === "offline") {
        const text = document.getElementById(
          this.resumeConfig["cities"].elementId
        );
        if (this.formData["cities"].length > 0) {
          text.textContent = this.parseCityNames(this.formData["cities"]).join(
            ", "
          );
          container.classList.remove("hide");
        }
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
        text.textContent = data.join(", ");
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
    }

    completePackage() {
      const container = document.getElementById(
        this.resumeConfig["package_name"].elementId
      );
      const offlineContent = document.getElementById("overzichtOffline");

      const existingPackages = container.getElementsByClassName(
        "overzicht_package-item"
      );
      while (existingPackages.length > 0) {
        existingPackages[0].parentNode.removeChild(existingPackages[0]);
      }
      if (this.formData["course_type"] === "offline") {
        offlineContent.classList.add("active");
      } else {
        // Render package
        offlineContent.classList.remove("active");
        const selectedPackage = this.packageSelected;
        if (selectedPackage) {
          let packageElement = document.createElement("div");
          packageElement.classList.add("overzicht_package-item");
          this.addPackageItemElements(packageElement, selectedPackage, true);
          container.appendChild(packageElement);
        } else {
          container.textContent = "No se ha seleccionado ningÃºn paquete.";
        }
      }
    }

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
      ["phone", "email"].forEach((key) => {
        dataLayer.push({ [key]: this.formData[key] });
      });
      this.instanceGA.sendEvent(
        "Aanmelding by step",
        "1: Aanmelding by step",
        "send"
      );
      const data = await this.sendDataBack();
      if (data) {
        localStorage.removeItem("fechaGlobalSeleccionada");
        const authTokens = data.auth_tokens;
        const encodedTokens = encodeURIComponent(JSON.stringify(authTokens));
        document.cookie = `tokens=${encodedTokens}`;
        return this.redirectTo("/bestellen");
      }
    }

    async sendDataBack() {
      const data = this.getFormData();
      let url = this.urls.urlPostMultiStepForm;

      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      };

      if (this.isReapplyFlow) {
        const accessToken = await this.instanceToken.checkAndRefreshToken();
        url = `${url}?is_reapply=true`;
        if (accessToken) {
          const token = accessToken.access;
          options.headers["Authorization"] = `Bearer ${token}`;
        }
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
      keyGA: "email",
      keysDataLayerGA: ["phone", "email"],
    },
    { id: "overzicht", form: "Resume" },
  ];
  const formManager = new FormManager(steps);
  formManager.initialize();
}

if (window.location.pathname === "/bestellen") {
  class OrderManager {
    constructor() {
      this.instanceToken = Authentication.getInstance();
      this.instanceGA = GA.getInstance();
      this.package_starting_at = null;
      this.isMijnOnline = null;
      this.containerMijn = document.getElementById("bestellenMijn");
      this.containerDefault = document.getElementById("bestellenDefault");
      this.buttonLink = document.getElementById("btnLink");
      this.buttonText = document.getElementById("btnText");
      this.urlFinalRedirectProd = "https://www.nutheorie.nl/user-profile";
      this.urlFinalRedirectDevelop =
        "https://develop.nutheorie.be/user-profile";
      this.urlFailRedirectProd = "https://www.nutheorie.nl/betaling/failed";
      this.urlFailRedirectDevelop =
        "https://develop.nutheorie.be/betaling/failed";
      this.PLANS_DELTA = 29;
      this.REAPPLY_PLANS_DELTA = 19;
      this.initAPIUrlVariables();
      this.initialize();
    }

    async initialize() {
      const userData = await this.instanceToken.preloadUserApplicationData();
      this.displayOrderSummary(userData);
      this.handleStoredData(userData);
      this.isMijnOnline =
        userData.course_type === "online" && userData.is_mijn_reservation;
      this.buttonText.textContent = this.isMijnOnline
        ? "Betalen"
        : "Aanbetaling";
      this.handleContainer(userData);
      this.buttonLink.addEventListener("click", () =>
        this.requestLink(userData)
      );
      this.dateCalendar = null;
    }

    initAPIUrlVariables() {
      let apiBaseUrl = apiBaseUrls[window.location.hostname] || urlProd;

      this.urlPaymentLink = `${apiBaseUrl}api/applications/payment_link/`;
      this.urlPackageStart = `${apiBaseUrl}api/applications/set_package_start/`;

      const finalRedirectUrls = {
        "www.develop.nutheorie.be": this.urlFinalRedirectDevelop,
        "webflow.nutheorie.be": this.urlFinalRedirectDevelop,
        default: this.urlFinalRedirectProd,
      };

      const failRedirectUrls = {
        "www.develop.nutheorie.be": this.urlFailRedirectDevelop,
        "webflow.nutheorie.be": this.urlFailRedirectDevelop,
        default: this.urlFailRedirectProd,
      };

      this.urlFinalRedirect =
        finalRedirectUrls[window.location.hostname] ||
        finalRedirectUrls.default;
      this.urlFailRedirect =
        failRedirectUrls[window.location.hostname] || failRedirectUrls.default;
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

      const processedDescriptions = processDescriptionItems(
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
      let priceSubtotal = formData.is_reapply_allowed
        ? Number(pkg.old_price) + this.REAPPLY_PLANS_DELTA
        : Number(pkg.old_price) + this.PLANS_DELTA;
      priceSubtotalDiv.textContent = priceSubtotal.toFixed(2);

      let priceKortingDiv = packageElement.querySelector("#priceKorting");
      let discount =
        parseFloat(priceSubtotal) -
        parseFloat(priceBeforeDecimal + "." + priceAfterDecimal);
      priceKortingDiv.textContent = `- ${discount.toFixed(2)}`;

      let priceTotalDiv = packageElement.querySelector("#priceTotal");
      priceTotalDiv.textContent = ` ${paymentAmount}`;
    }

    async requestLink(formData) {
      const { payment_amount } = formData;
      ["phone", "email"].forEach((key) => {
        dataLayer.push({ [key]: formData[key] });
      });
      this.instanceGA.checkoutItem("IDEAL");
      console.log(dataLayer);
      let token;
      const access = await this.instanceToken.checkAndRefreshToken();
      if (access && access.access) {
        token = access.access;
      }

      let payment_link;
      let package_starting_at = this.formatCalendarDate();

      const objUrlPayloadPackage = {
        url: this.urlPackageStart,
        payload: { package_starting_at },
        token,
      };

      const objUrlPayloadPayment = {
        url: this.urlPaymentLink,
        payload: {
          method: "ideal",
          amount: payment_amount,
          final_redirect_url: this.urlFinalRedirect,
          fail_redirect_url: this.urlFailRedirect,
        },
        token,
      };
      if (this.isMijnOnline) {
        this.instanceGA.sendEvent(
          "Aanmelding by step",
          "1: Aanmelding by step",
          "PrePayment"
        );
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
        this.generateContainerMijn(formData);
        this.generatePackage(formData);
      } else {
        this.containerMijn.style.display = "none";
        this.containerDefault.style.display = "block";
        bestellenMijnPackage.style.display = "none";
        bestellenImage.style.display = "block";
      }
    }

    generateContainerMijn(formData) {
      this.buttonLink.classList.add("disabled-button");
      const radioDiv1 = document.createElement("div");
      radioDiv1.classList.add("bestellen_mijn-radio");

      const radio1 = document.createElement("input");
      radio1.type = "radio";
      radio1.id = "radio1";
      radio1.name = "mijnOption";
      radio1.value = "direct";
      radio1.checked = true;
      if (radio1.checked) {
        this.enableButton();
      }
      radio1.classList.add("mijnRadio");

      const label1 = document.createElement("label");
      label1.htmlFor = "radio1";
      label1.textContent = "Direct activeren";
      label1.classList.add("form_label", "text-weight-semibold");

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
        calendarIcon.style.display = "none";
        this.chooseDateText.style.display = "none";
        this.planAvailableUntilText.style.display = "none";
        this.getCurrentDateTime();
        this.dateCalendar = null;
      });
      radio2.addEventListener("change", () => this.handleRadioChange(formData));

      const label2 = document.createElement("label");
      label2.htmlFor = "radio2";
      label2.textContent = "Vul de datum in wanneer je pakket in moet gaan";
      label2.classList.add("form_label", "text-weight-semibold");

      radioDiv2.appendChild(radio2);
      radioDiv2.appendChild(label2);

      this.containerMijn.appendChild(radioDiv1);
      this.containerMijn.appendChild(radioDiv2);

      const dateInputContainer = document.createElement("div");
      dateInputContainer.classList.add("date-input-container");

      const dateInput = document.createElement("input");
      dateInput.type = "text";
      dateInput.id = "dateInput";
      dateInput.classList.add("flatpickr", "form_input");
      dateInput.style.display = "none";

      dateInputContainer.appendChild(dateInput);

      const calendarIcon = document.createElement("img");
      calendarIcon.src =
        "https://uploads-ssl.webflow.com/65575474f34982c6bd8b4b70/65b7f97b68336ec19817493a_calendar-date.svg";
      calendarIcon.classList.add("calendar-icon");
      calendarIcon.id = "calendarIcon";
      calendarIcon.style.display = "none";
      dateInputContainer.appendChild(calendarIcon);

      const clearButton = document.createElement("button");
      clearButton.innerHTML = "&times;";
      clearButton.classList.add("clear-button");
      clearButton.style.display = "none";
      clearButton.onclick = () => {
        dateInput.value = "";
        clearButton.style.display = "none";
        calendarIcon.style.display = "block";
        this.disableButton();
      };
      dateInputContainer.appendChild(clearButton);

      calendarIcon.style.transition = "opacity 0.3s ease-in-out";
      clearButton.style.transition = "opacity 0.3s ease-in-out";

      dateInputContainer.onmouseover = () => {
        if (dateInput.value) {
          clearButton.style.display = "block";
          calendarIcon.style.display = "none";
        }
      };
      dateInputContainer.onmouseout = () => {
        clearButton.style.display = "none";
        if (!radio1.checked) {
          calendarIcon.style.display = "block";
        }
      };

      this.chooseDateText = document.createElement("div");
      this.chooseDateText.textContent = "Kies een datum";
      this.chooseDateText.classList.add(
        "text-size-small",
        "text-weight-semibold"
      );
      this.chooseDateText.style.display = "none";

      this.planAvailableUntilText = document.createElement("div");
      this.planAvailableUntilText.textContent =
        "Plan is beschikbaar tot " + this.calculateValidUntilDate(formData);
      this.planAvailableUntilText.classList.add(
        "text-size-tiny",
        "text-weight-bold"
      );
      this.planAvailableUntilText.style.color = "#9c9c9c";
      this.planAvailableUntilText.style.display = "none";

      this.containerMijn.appendChild(this.chooseDateText);
      this.containerMijn.appendChild(this.planAvailableUntilText);

      this.containerMijn.appendChild(dateInputContainer);

      flatpickr("#dateInput", {
        enableTime: true,
        dateFormat: "d-m-Y H:i",
        minDate: "today",
        time_24hr: true,
        minuteIncrement: 1,
        disableMobile: "true",
        locale: {
          firstDayOfWeek: 1,
          weekdays: {
            shorthand: ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"],
            longhand: [
              "Zondag",
              "Maandag",
              "Dinsdag",
              "Woensdag",
              "Donderdag",
              "Vrijdag",
              "Zaterdag",
            ],
          },
          months: {
            shorthand: [
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
            ],
            longhand: [
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
            ],
          },
        },
        onChange: (selectedDates, dateStr, instance) => {
          this.dateCalendar = instance.formatDate(
            selectedDates[0],
            "Y-m-d\\TH:i:00+01:00"
          );
          this.enableButton();
          this.updatePlanAvailableUntilText(formData);
        },
      });
    }

    handleRadioChange(formData) {
      this.buttonLink.classList.add("disabled-button");
      const radio2 = document.getElementById("radio2");
      const dateInput = document.getElementById("dateInput");
      const calendarIcon = document.getElementById("calendarIcon");

      if (radio2.checked) {
        let now = new Date();
        let currentDateStr = now
          .toLocaleDateString("nl-NL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
          .replace(/\//g, "-");

        let year = now.getFullYear();
        let month = (now.getMonth() + 1).toString().padStart(2, "0");
        let day = now.getDate().toString().padStart(2, "0");
        let hours = now.getHours().toString().padStart(2, "0");
        let minutes = now.getMinutes().toString().padStart(2, "0");

        let formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:00+01:00`;
        this.dateCalendar = formattedDate;
        dateInput.value = currentDateStr;
        dateInput.style.display = "block";
        calendarIcon.style.display = "block";
        this.chooseDateText.style.display = "block";
        this.planAvailableUntilText.style.display = "block";
        this.updatePlanAvailableUntilText(formData);
        this.enableButton();
      } else {
        dateInput.style.display = "none";
        calendarIcon.style.display = "none";
        this.chooseDateText.style.display = "none";
        this.planAvailableUntilText.style.display = "none";
      }
    }

    updatePlanAvailableUntilText(formData) {
      if (this.dateCalendar) {
        this.planAvailableUntilText.textContent =
          "Plan is beschikbaar tot " + this.calculateValidUntilDate(formData);
      }
    }

    enableButton() {
      if (this.dateCalendar || this.getCurrentDateTime()) {
        this.buttonLink.classList.remove("disabled-button");
      } else {
        this.buttonLink.classList.add("disabled-button");
      }
    }

    disableButton() {
      this.buttonLink.classList.add("disabled-button");
    }

    formatCalendarDate() {
      if (this.dateCalendar) {
        return this.dateCalendar;
      }
      return this.getCurrentDateTime();
    }

    calculateValidUntilDate(formData) {
      if (!this.dateCalendar) {
        return null;
      }

      const pkg = formData.package_info;

      let [datePart, timePart] = this.dateCalendar.split("T");
      let [year, month, day] = datePart
        .split("-")
        .map((num) => parseInt(num, 10));
      let [hours, minutes] = timePart
        .substring(0, 5)
        .split(":")
        .map((num) => parseInt(num, 10));

      let dateFromCalendar = new Date(year, month - 1, day, hours, minutes);

      dateFromCalendar.setDate(dateFromCalendar.getDate() + pkg.duration);

      day = dateFromCalendar.getDate().toString().padStart(2, "0");
      month = (dateFromCalendar.getMonth() + 1).toString().padStart(2, "0");
      year = dateFromCalendar.getFullYear();
      hours = dateFromCalendar.getHours().toString().padStart(2, "0");
      minutes = dateFromCalendar.getMinutes().toString().padStart(2, "0");

      return `${day}-${month}-${year} ${hours}:${minutes}`;
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

    updateRowVisibility(formData) {
      const showLocations =
        (formData.cities && formData.cities.length > 0) ||
        (formData.cbr_locations && formData.cbr_locations.length > 0);
      const showDates =
        (formData.course_names && formData.course_names.length > 0) ||
        (formData.course_dates && formData.course_dates.length > 0);

      this.toggleElementVisibility("locationsRow", showLocations);
      this.toggleElementVisibility("datesRow", showDates);
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
      this.displayPakket(formData);
      this.updateRowVisibility(formData);
      updateSvgVisibility(formData);
      this.updateVragenText(formData);
      this.updateAanmeldingText(formData);
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
        formData.cities &&
        formData.cities.length > 0 &&
        formData.course_type === "offline"
      );
      if (
        formData.cities &&
        formData.cities.length > 0 &&
        formData.course_type === "offline"
      ) {
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

    displayPakket(formData) {
      const hasPackageName = !!formData.package_name;

      this.toggleElementVisibility("pakketRow", hasPackageName);

      if (hasPackageName) {
        const pakketTextElement = document.getElementById("pakketText");
        if (pakketTextElement) {
          pakketTextElement.textContent = formData.package_name;
        }
      }
    }

    updateAanmeldingText(formData) {
      const aanmeldingTextElement = document.getElementById("aanmeldingText");
      if (aanmeldingTextElement) {
        aanmeldingTextElement.textContent = this.getAanmeldingText(formData);
      }
    }

    getAanmeldingText(formData) {
      const textRecicle = `Bedankt voor jouw aanmelding! Om het CBR examen voor jou te reserveren vragen wij jou eerst om een aanbetaling te voldoen. De kosten van het examen moeten we namelijk vooruitbetalen aan het CBR. Je betaalt dan ook direct een gedeelte van het pakket. De aanbetaling kun je voldoen via de onderstaande knop.`;
      if (
        formData.course_type === "offline" &&
        formData.is_mijn_reservation &&
        formData.is_reapply_allowed
      ) {
        return `Bedankt voor jouw aanmelding voor een theoriecursus met korting! Om het CBR examen voor jou te reserveren vragen wij jou eerst om een aanbetaling te voldoen. De kosten van het examen moeten we namelijk vooruitbetalen aan het CBR. Je krijgt dan ook direct toegang tot ons online lesmateriaal. Dit bestaat uit samenvatting video’s, een e-book, honderden oefenvragen en CBR oefenexamens. De aanbetaling kun je voldoen via de onderstaande knop.
        `;
      } else if (
        formData.course_type === "offline" &&
        formData.is_mijn_reservation &&
        !formData.is_reapply_allowed
      ) {
        return `Bedankt voor jouw aanmelding! We vragen om een aanbetaling omdat je direct daarna toegang krijgt tot ons online lesmateriaal. Dit bestaat uit samenvatting video’s, een e-book, honderden oefenvragen en CBR oefenexamens. Vervolgens ontvangen we graag jouw examengegevens en gaan wij jou inplannen voor een theoriecursus die aansluit op jouw CBR theorie examen. De aanbetaling kun je voldoen via de onderstaande knop.`;
      } else if (
        formData.course_type === "offline" &&
        !formData.is_mijn_reservation &&
        formData.is_reapply_allowed
      ) {
        return `Bedankt voor jouw aanmelding voor een theoriecursus met korting! Om het CBR examen voor jou te reserveren vragen wij jou eerst om een aanbetaling te voldoen. De kosten van het examen moeten we namelijk vooruitbetalen aan het CBR. Je krijgt dan ook direct toegang tot ons online lesmateriaal. Dit bestaat uit samenvatting video’s, een e-book, honderden oefenvragen en CBR oefenexamens. De aanbetaling kun je voldoen via de onderstaande knop.`;
      } else if (
        formData.course_type === "offline" &&
        !formData.is_mijn_reservation &&
        !formData.is_reapply_allowed
      ) {
        return `Bedankt voor jouw aanmelding! Om het CBR examen voor jou te reserveren vragen wij jou eerst om een aanbetaling te voldoen. De kosten van het examen moeten we namelijk vooruitbetalen aan het CBR. Je krijgt dan ook direct toegang tot ons online lesmateriaal. Dit bestaat uit samenvatting video’s, een e-book, honderden oefenvragen en CBR oefenexamens. De aanbetaling kun je voldoen via de onderstaande knop.`;
      } else if (
        formData.course_type === "offline" &&
        formData.is_reapply_allowed
      ) {
        return `Bedankt voor jouw aanmelding voor een theoriecursus met korting! Om het CBR examen voor jou te reserveren vragen wij jou eerst om een aanbetaling te voldoen. De kosten van het examen moeten we namelijk vooruitbetalen aan het CBR. Je betaalt dan ook direct een gedeelte van het pakket. De aanbetaling kun je voldoen via de onderstaande knop.`;
      } else if (
        formData.course_type === "offline" &&
        !formData.is_reapply_allowed
      ) {
        return textRecicle;
      } else if (formData.course_type === "online") {
        return textRecicle;
      }
      return "";
    }

    updateVragenText(formData) {
      const isMijnReservationOnline =
        formData.is_mijn_reservation && formData.course_type === "online";
      this.toggleClass("defaultFaq", "hide", isMijnReservationOnline);
      this.toggleClass("mijnFaq", "hide", !isMijnReservationOnline);
      this.toggleClass("bestellenWanneerText", "hide", isMijnReservationOnline);

      const totaalTextElement = document.getElementById("totaalText");
      const aanbetalingTextElement = document.getElementById("aanbetalingText");

      if (totaalTextElement) {
        totaalTextElement.textContent = this.getTotaalTextContent(formData);
      }

      if (aanbetalingTextElement) {
        aanbetalingTextElement.textContent =
          this.getAanbetalingTextContent(formData);
      }
    }

    toggleClass(elementId, className, condition) {
      const element = document.getElementById(elementId);
      if (element) {
        if (condition) {
          element.classList.add(className);
        } else {
          element.classList.remove(className);
        }
      }
    }

    getTotaalTextContent(formData) {
      if (
        formData.course_type === "offline" &&
        !formData.is_mijn_reservation &&
        !formData.is_reapply_allowed
      ) {
        return `De theoriecursus in 1 dag met aansluitend het CBR examen kost 99,- (exclusief CBR examenkosten). Ons online lesmateriaal t.w.v. 29,- zit hier al bij inbegrepen. Voor het reserveren van het CBR examen hanteren we exact dezelfde tarieven als het CBR die bovenop de kosten van de theoriecursus komen. Een standaard examen kost 48,- en een verlengd examen kost 61,-. Het bedrag van de theoriecursus kun je via iDeal betalen of per bank naar ons overboeken. Voor dit laatste kun je contact met ons opnemen via de telefoon of e-mail.`;
      } else if (
        formData.course_type === "offline" &&
        formData.is_mijn_reservation &&
        !formData.is_reapply_allowed
      ) {
        return `De theoriecursus in 1 dag met aansluitend het CBR examen kost 99,- (exclusief CBR examenkosten). Ons online lesmateriaal t.w.v. 29,- zit hier al bij inbegrepen. Aangezien je het examen zelf hebt gereserveerd hoef je deze kosten niet meer aan ons te betalen. Het bedrag van de theoriecursus kun je via iDeal betalen of per bank naar ons overboeken. Voor dit laatste kun je contact met ons opnemen via de telefoon of e-mail.`;
      } else if (
        formData.course_type === "offline" &&
        !formData.is_mijn_reservation &&
        formData.is_reapply_allowed
      ) {
        return `De theoriecursus in 1 dag met aansluitend het CBR examen kost 99,- (exclusief CBR examenkosten) maar omdat je reeds klant bij ons bent geweest kun jij de theoriecursus nu met 50% korting volgen waardoor je tijdelijk slechts 49,50 betaalt. Ons online lesmateriaal t.w.v. 29,- zit hier al bij inbegrepen. Voor het reserveren van het CBR examen hanteren we exact dezelfde tarieven als het CBR die bovenop de kosten van de theoriecursus komen. Een standaard examen kost 48,- en een verlengd examen kost 61,-. Het bedrag van de theoriecursus kun je via iDeal betalen of per bank naar ons overboeken. Voor dit laatste kun je contact met ons opnemen via de telefoon of e-mail.
        `;
      } else if (
        formData.course_type === "offline" &&
        formData.is_mijn_reservation &&
        formData.is_reapply_allowed
      ) {
        return `De theoriecursus in 1 dag met aansluitend het CBR examen kost 99,- (exclusief CBR examenkosten) maar omdat je reeds klant bij ons bent geweest kun jij de theoriecursus nu met 50% korting volgen waardoor je tijdelijk slechts 49,50 betaalt. Ons online lesmateriaal t.w.v. 29,- zit hier al bij inbegrepen. Aangezien je het examen zelf hebt gereserveerd hoef je deze kosten niet meer aan ons te betalen. Het bedrag van de theoriecursus kun je via iDeal betalen of per bank naar ons overboeken. Voor dit laatste kun je contact met ons opnemen via de telefoon of e-mail.`;
      } else if (
        formData.course_type === "online" &&
        !formData.is_reapply_allowed
      ) {
        return `De prijzen van onze online theorie pakketten verschillen. Nutheorie online heeft namelijk verschillende pakketten die allemaal een volledige videocursus, een uitgebreid e-book en honderden oefenvragen bevatten maar anders zijn qua duur van toegankelijkheid en het aantal vergelijkbare CBR examens waarmee je kunt oefenen. Voor het reserveren van het CBR examen hanteren we exact dezelfde tarieven als het CBR die bovenop de kosten van de theoriecursus komen. Een standaard examen kost 48,- en een verlengd examen kost 61,-. Het bedrag van de cursus kun je via iDeal betalen of per bank naar ons overboeken. Voor dit laatste kun je contact met ons opnemen via de telefoon of e-mail.`;
      } else if (
        formData.course_type === "online" &&
        formData.is_reapply_allowed
      ) {
        return `De prijzen van onze online theorie pakketten verschillen. Nutheorie online heeft namelijk verschillende pakketten die allemaal een volledige videocursus, een uitgebreid e-book en honderden oefenvragen bevatten maar anders zijn qua duur van toegankelijkheid en het aantal vergelijkbare CBR examens waarmee je kunt oefenen. Aangezien jij reeds klant bij ons bent geweest kun jij tijdelijk een speciaal theoriepakket aanschaffen t.w.v. 63,99 met meer dan 50% korting. Je betaalt voor een theoriepakket van 14 dagen met 15 CBR oefenexamens slechts 29,99 (exclusief CBR examenkosten). Voor het reserveren van het CBR examen hanteren we exact dezelfde tarieven als het CBR die bovenop de kosten van de theoriecursus komen. Een standaard examen kost 48,- en een verlengd examen kost 61,-. Het bedrag van de cursus kun je via iDeal betalen of per bank naar ons overboeken. Voor dit laatste kun je contact met ons opnemen via de telefoon of e-mail.
        `;
      }
      return "";
    }

    getAanbetalingTextContent(formData) {
      if (formData.course_type === "offline" && !formData.is_mijn_reservation) {
        return `We vragen om een aanbetaling om het CBR examen te reserveren en omdat je na het voldoen hiervan direct twee maanden lang toegang krijgt tot ons online lesmateriaal t.w.v. 29,-. De kosten van het theorie examen moeten wij namelijk vooruitbetalen aan het CBR.`;
      } else if (
        formData.course_type === "offline" &&
        formData.is_mijn_reservation
      ) {
        return `We vragen om een aanbetaling omdat je na het voldoen hiervan direct twee maanden lang toegang krijgt tot ons online lesmateriaal t.w.v 29,- en wij jouw plaats op de theoriecursus reserveren.`;
      } else if (formData.course_type === "online") {
        return `We vragen om een aanbetaling om enerzijds het CBR examen te reserveren. De kosten van het theorie examen moeten wij namelijk vooruitbetalen aan het CBR. Anderzijds betaal je middels de aanbetaling direct een gedeelte van het pakket om te voorkomen dat er misbruik wordt gemaakt van ons vermogen om snel het CBR examen te kunnen reserveren.`;
      }
      return "";
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

class User {
  constructor() {
    this.instanceToken = Authentication.getInstance();
    this.userData = this.instanceToken.getUserInfoBack();
    this.initializeLoginButton();
  }

  logout() {
    document.cookie = "tokens=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/inloggen";
  }

  hasPaid() {
    return this.userData?.is_paid;
  }

  updateLoginButtonText() {
    const loginButton = document.getElementById("btn-login");
    if (loginButton) {
      const currentPath = window.location.pathname;
      const buttonTextMap = {
        "/user-profile": "Uitloggen",
        "/bestellen": this.hasPaid() ? "Profiel" : "Uitloggen",
        default: this.instanceToken.checkToken() ? "Profiel" : "Inloggen",
      };

      loginButton.textContent =
        buttonTextMap[currentPath] ?? buttonTextMap["default"];
    }
  }

  initializeLoginButton() {
    const loginButton = document.getElementById("btn-login");
    if (loginButton) {
      this.updateLoginButtonText();

      loginButton.addEventListener("click", () => {
        const currentPath = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        const reapply = urlParams.get("reapply") === "true";
        const isLoggedIn = this.instanceToken.checkToken();

        const actionMap = {
          "/user-profile": () => this.logout(),
          "/bestellen": () =>
            this.hasPaid()
              ? (window.location.href = "/user-profile")
              : this.logout(),
          default: () => {
            if (isLoggedIn) {
              if (reapply) {
                window.location.href = "/user-profile";
              } else if (!this.hasPaid()) {
                window.location.href = "/bestellen";
              } else {
                window.location.href = "/user-profile";
              }
            } else {
              window.location.href = "/inloggen";
            }
          },
        };

        (actionMap[currentPath] || actionMap["default"])();
      });
    }
  }
}

const user = new User();
