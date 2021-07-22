/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useEffect, useState, useLayoutEffect, useContext } from 'react';
import moment from 'moment';
import { Button, Icon, icons } from '@ad-ui/components';
import { ManageCalendarsProps } from '../../Scheduler.types';
import { checkColorContrastToWhite } from '../../../../utils';
import { StoreContext } from '../../../../store/root.store';
import { MOMENT_UNITS } from '../../../../constants/moment.constants';

export const ManageCalendarsView: React.FC<ManageCalendarsProps> = ({
  hourDuration,
  locationWorkingHours,
  step,
  start,
  end,
  manageCalendarsData,
  toggle,
  itemCalendarHandle,
  plusResize,
  minusResize,
  itemCalendar,
  isFindAvailability,
  isInModal,
}): JSX.Element => {
  const {
    state: {
      auth: {
        userSettings: { Use24HourTimeFormat },
      },
    },
  } = useContext(StoreContext);

  const [duration, setDuration] = useState(0);
  const [timeLine, setTimeLine] = useState([]);
  const [use24HourTimeFormat] = useState(Use24HourTimeFormat === 'true');
  const [outOfGrid, setOutOfGrid] = useState(0);
  const [outOfGridStart, setOutOfGridStart] = useState(0);
  const workingHours = moment(
    locationWorkingHours && locationWorkingHours.end,
  ).diff(moment(locationWorkingHours && locationWorkingHours.start), 'hours');
  const getStartLocalonHours = moment(
    locationWorkingHours && locationWorkingHours.start,
  )
    .utc()
    .get('hours');

  const itemStep = (_hourDuration, _step): number =>
    (_hourDuration * _step) / 60;
  const elRef = React.useRef(null);
  const workingOursOutOfGridStart = moment(start).isBefore(
    locationWorkingHours && locationWorkingHours.start,
  );
  const workingOursOutOfGridEnd = moment(end).isAfter(
    locationWorkingHours && locationWorkingHours.end,
  );

  useEffect(() => {
    const durationOffsets = 6;
    let duration: number;

    if (isFindAvailability) {
      setDuration(
        durationOffsets + moment(end).diff(moment(start), 'minutes') / step,
      );
    } else {
      const durr = durationOffsets + (workingHours * 60 + outOfGrid) / step;
      setDuration(durr);
    }
  }, [start, end, step, locationWorkingHours, outOfGrid]);

  useEffect(() => {
    if (
      locationWorkingHours &&
      locationWorkingHours.end &&
      workingOursOutOfGridEnd
    ) {
      const outOfBlockWidthEnd = moment(end).diff(
        moment(locationWorkingHours && locationWorkingHours.end),
        'minutes',
      );
      setOutOfGrid(outOfBlockWidthEnd);
    } else if (
      locationWorkingHours &&
      locationWorkingHours.start &&
      workingOursOutOfGridStart
    ) {
      const outOfBlockWidthStart = moment(
        locationWorkingHours && locationWorkingHours.start,
      ).diff(moment(start), 'minutes');

      setOutOfGridStart(outOfBlockWidthStart);
      setOutOfGrid(outOfBlockWidthStart);
    } else {
      setOutOfGrid(0);
      setOutOfGridStart(0);
    }
  }, [start, end, locationWorkingHours]);

  const itemWidth = (durationItem, _hourDuration): number =>
    (durationItem * _hourDuration) / 60;

  const itemOffset = (hourDuration, start, itemStart): number => {
    if (isFindAvailability) {
      const diffAvailability = moment(itemStart)
        .utc()
        .diff(moment(start).utc().subtract(45, 'minutes'), 'minutes');
      return diffAvailability * (hourDuration / 60);
    }

    const diff = moment(itemStart).diff(
      moment(start)
        .utc()
        .startOf(MOMENT_UNITS.day)
        .add(getStartLocalonHours, 'hour')
        .subtract(outOfGridStart, 'minutes')
        .subtract(45, 'minutes'),
      'minutes',
    );

    return (diff * hourDuration) / 60;
  };

  useEffect(() => {
    const items = [];
    for (let i = 0; i < duration; i++) {
      if (isFindAvailability) {
        items.push({
          time: moment(start)
            .startOf(MOMENT_UNITS.day)
            .subtract(45, 'minutes')
            .add(i * step, 'minutes')
            .add(1, 'hour'),
        });
      } else {
        items.push({
          time: moment(start)
            .utc()
            .startOf(MOMENT_UNITS.day)
            .add(getStartLocalonHours, 'hour')
            .subtract(45, 'minutes')
            .subtract(outOfGridStart, 'minutes')
            .add(outOfGridStart % 60, 'minutes')
            .add(i * step, 'minutes'),
        });
      }
    }

    setTimeLine(items);
  }, [duration, locationWorkingHours, outOfGrid]);

  const formatTime = (time): string => {
    const momentDuration = moment.duration(time, 'minutes');
    const hour = momentDuration.hours();
    const minutes = momentDuration.minutes();
    if (hour) {
      if (minutes === 0) {
        return `${hour}h`;
      }

      if (minutes === 30) {
        return `${hour}.5h`;
      }

      return `${hour}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const scrollEl = itemOffset(hourDuration, start, start);

  useLayoutEffect(() => {
    if (elRef.current) {
      elRef.current.scrollLeft = scrollEl;
    }
  }, [!!elRef.current, scrollEl]);

  const hoursFormat = use24HourTimeFormat ? 'HH:mm' : 'h';

  return (
    <div className="manage-calendars">
      <div className="manage-calendars-scroll" ref={elRef}>
        <div className="manage-calendars-timeLineGrid">
          {timeLine.map((stepItem, idx) => (
            <div
              className="manage-calendars-timeLineGridItem"
              style={{
                width: `${itemStep(hourDuration, step)}px`,
                flexBasis: `${itemStep(hourDuration, step)}px`,
              }}
            >
              <div className="manage-calendars-timeline">
                <div
                  className={`manage-calendars-timeline${
                    stepItem.time.format('m') === '0' && '-hour'
                  }`}
                >
                  <span className="manage-calendars-timeline-time text-subtitle2">
                    {stepItem.time.format('m') === '0' &&
                      (isFindAvailability
                        ? stepItem.time.format('h') - 1
                        : stepItem.time.format(hoursFormat))}
                  </span>
                  <span className="manage-calendars-timeline-midnight text-overline">
                    {stepItem.time.format('m') === '0' &&
                      (isFindAvailability
                        ? 'HR'
                        : !use24HourTimeFormat && stepItem.time.format('A'))}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div
          className={`manage-calendars-data-items ${
            itemCalendar ? 'active' : ''
          }`}
        >
          {manageCalendarsData.map((items) => (
            <div
              className={
                itemCalendar && itemCalendar[0].id === items[0].id
                  ? 'row active'
                  : isFindAvailability && items[0].id === 'patient'
                  ? 'row disabled'
                  : 'row'
              }
              onClick={() => {
                if (itemCalendarHandle) {
                  itemCalendarHandle(items);
                }
                if (!isInModal) {
                  toggle(true);
                }
              }}
              style={{
                width: `${itemStep(hourDuration, step) * duration}px`,
              }}
            >
              {items.map(
                (item) =>
                  item &&
                  item.start &&
                  item.end && (
                    <div
                      className="item"
                      style={{
                        left: `${itemOffset(
                          hourDuration,
                          start,
                          item.start,
                        )}px`,
                        width: `${itemWidth(
                          moment(item.end).diff(moment(item.start), 'minutes'),
                          hourDuration,
                        )}px`,
                        background: checkColorContrastToWhite(
                          item.color && item.color.red,
                          item.color && item.color.green,
                          item.color && item.color.blue,
                        ),
                      }}
                    >
                      <span className="name text-subtitle2">{item.name}</span>
                      <span className="time text-body2">
                        {formatTime(
                          moment(item.end).diff(moment(item.start), 'minutes'),
                        )}
                      </span>
                    </div>
                  ),
              )}
              {(workingOursOutOfGridStart || workingOursOutOfGridEnd) && (
                <div
                  className="addional-block"
                  style={{
                    width: `${((outOfGrid + 45) * hourDuration) / 60}px`,
                    [workingOursOutOfGridEnd ? 'right' : 'left']: 0,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="manage-calendars-resize-controls">
        <Button
          withIcon
          invert
          color="secondary"
          size="small"
          onClick={plusResize}
        >
          <Icon iconName={icons.add} />
        </Button>
        <Button
          withIcon
          invert
          color="secondary"
          size="small"
          onClick={minusResize}
        >
          <Icon iconName={icons.minus} />
        </Button>
      </div>
    </div>
  );
};
