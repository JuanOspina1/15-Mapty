'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  // click() {
  //   this.clicks++;
  // }
}
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    /// km/hr
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// Sample data
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

/////////////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAllButton = document.querySelector('.delete-all__btn');
const editorForm = document.querySelector('.editor');
const editorDistance = document.querySelector('.editor__input--distance');
const editorDuration = document.querySelector('.editor__input--duration');
const editorCadence = document.querySelector('.editor__input--cadence');
const editorElevation = document.querySelector('.editor__input--elevation');
const sortType = document.querySelector('.sort__input--type');

// Creating the edit button
// const editButton = document.createElement('button');
// editButton.classList.add('edit__btn');
// editButton.textContent = 'EDIT';

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #editedWorkout;

  constructor() {
    // get users position
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();

    //Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    deleteAllButton.addEventListener('click', this.deleteAll.bind(this));
    editorForm.addEventListener('submit', this._submitWorkout.bind(this));
    sortType.addEventListener('change', this._sortWorkouts.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    // console.log(latitude, longitude);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //  Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;

    let workout;

    // Check if data is valid

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
      console.log([lat, lng]);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      // Check if data is valid
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new obj to workout array
    this.#workouts.push(workout);

    // render workout on map as marker
    this._renderWorkoutMarker(workout);

    // render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.name}" data-id=${workout.id}>
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;
    if (workout.type === 'running')
      html += `<div class="workout__details">
     <span class="workout__icon">⚡️</span>
     <span class="workout__value">${workout.pace.toFixed(1)}</span>
     <span class="workout__unit">min/km</span>
   </div>
   <div class="workout__details">
     <span class="workout__icon">🦶🏼</span>
     <span class="workout__value">${workout.cadence}</span>
     <span class="workout__unit">spm</span>
   </div>
   <button class="edit__btn">EDIT</button>
   <button class="singledelete__btn">DELETE</button>
 </li>
`;

    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
    <button class="edit__btn">EDIT</button>
    <button class="singledelete__btn">DELETE</button>
  </li> `;

    form.insertAdjacentHTML('afterend', html);

    // Add event listener to button upon creation
    const editButton = document.querySelector('.edit__btn');
    editButton.addEventListener('click', this._editWorkout.bind(this));

    const singleDeleteBtn = document.querySelector('.singledelete__btn');
    singleDeleteBtn.addEventListener(
      'click',
      this._singleDeleteWorkout.bind(this)
    );
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    //guard clause
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  //////////////////////////////////////////////////////////////
  //EXTRA ASSIGNMENTS

  // DELETING SECTION
  deleteAll() {
    this.#workouts = [];
    localStorage.removeItem('workouts');
    location.reload();
  }

  _singleDeleteWorkout(e) {
    // find the ID of the object where the "delete" button is clicked
    let workoutID = e.path[1].dataset.id;

    // Set the workouts array to the new array with the object filtered out
    this.#workouts = this.#workouts.filter(workout => workout.id != workoutID);

    this._setLocalStorage();

    // This will throw a quick error before reloading due to the "moveToPopup" method trying to find the cords
    location.reload();
  }

  // SORTING - Not working
  _sortWorkouts() {
    if (sortType.value === 'distance') {
      this.#workouts.sort(function (a, b) {
        return a.distance - b.distance;
      });
      this._setLocalStorage();
      location.reload();
    }

    if (sortType.value === 'duration') {
      this.#workouts.sort(function (a, b) {
        return a.duration - b.duration;
      });
      this._setLocalStorage();
      location.reload();
    }
  }

  // EDITING METHODS SECTION

  _showEditor() {
    editorForm.classList.remove('hidden');
    editorDistance.focus();
  }

  // Need to figure out how to allow the edit form to appear after one use without reloading the page
  _hideEditor() {
    editorDistance.value = '';
    editorForm.style.display = 'none';
    editorForm.classList.add('hidden');
  }

  _editWorkout(e) {
    this._showEditor();

    // identify the workouts ID that we want to reference based on clicking the edit button
    let workoutID = e.path[1].dataset.id;
    // console.log(workoutID);
    // console.log(this.#workouts);

    // find the matching workout based on the ID
    let matchingWorkout = this.#workouts.find(
      workout => workout.id === workoutID
    );
    // console.log(matchingWorkout);

    this.#editedWorkout = matchingWorkout;
    console.log(this.#editedWorkout);

    // Test using duration to toggle the field. Need to add the appropriate form fields for cadence and elevation HTML
    // Need to take in the value within the IF statement or else the value will be taken as 0. This may not need to be done since the field will not appear based on the "type"
    if (this.#editedWorkout.type === 'running') {
      editorCadence
        .closest('.editor__row')
        .classList.remove('form__row--hidden');
      editorElevation
        .closest('.editor__row')
        .classList.add('form__row--hidden');
    }

    if (this.#editedWorkout.type === 'cycling') {
      editorCadence.closest('.editor__row').classList.add('form__row--hidden');
      editorElevation
        .closest('.editor__row')
        .classList.remove('form__row--hidden');
    }
  }

  _submitWorkout(e) {
    e.preventDefault();

    const editedDistance = +editorDistance.value;
    const editedDuration = +editorDuration.value;
    const editedCadence = +editorCadence.value;
    const editedElevation = +editorElevation.value;
    // editedWorkout now has the updated distance
    console.log(editedDistance, editedDuration, editedCadence, editedElevation);

    // check if the inputs are valid
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp >= 0);

    if (
      !validInputs(
        editedDistance,
        editedDuration,
        editedElevation,
        editedCadence
      ) ||
      !allPositive(editedDistance, editedDuration)
    ) {
      return alert('Inputs have to be positive numbers!');
    } else {
      this.#editedWorkout.distance = editedDistance;
      this.#editedWorkout.duration = editedDuration;
      this.#editedWorkout.cadence = editedCadence;
      this.#editedWorkout.elevationGain = editedElevation;
    }

    //////////////////
    // changing the fields that are calculated upon created the object
    if (this.#editedWorkout.type === 'running') {
      this.#editedWorkout.pace =
        this.#editedWorkout.duration / this.#editedWorkout.distance;
    }

    if (this.#editedWorkout.type === 'cycling') {
      this.#editedWorkout.speed =
        this.#editedWorkout.distance / (this.#editedWorkout.duration / 60);
    }

    //hide editor after submitting
    this._hideEditor();

    // I NEVER PUSH THE UPDATED OBJECT TO THE ARRAY BUT IT GETS UPDATED - NEED TO UNDERSTAND WHY

    // add the updated #workouts to the local storage - the correct markers & workouts appear upon reload
    this._setLocalStorage();

    // reload the page to create the workouts based on local storage
    location.reload();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
