import moment from 'moment';

class TimeManager {
  private manualTime?: moment.Moment;

  // Gets the current time stored in the TimeManager or the current system time if not set
  public getCurrentTime(): Date {
    if (this.manualTime) {
      return this.manualTime.toDate();
    }
    return moment().toDate(); // Retrieves the current time and converts it to a Date object
  }

  // Sets the current time stored in the TimeManager, accepting a JavaScript Date object
  public setCurrentTime(date: Date): void {
    if (date instanceof Date && !isNaN(date.getTime())) {
      this.manualTime = moment(date);
    } else {
      throw new Error('Invalid date. Please provide a valid Date object.');
    }
  }

  // Reset the manually set time so that it retrieves the current real time
  public resetToRealTime(): void {
    this.manualTime = undefined;
  }
}

export default TimeManager;
