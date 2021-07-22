import React, {
  useState,
  useEffect,
  useMemo,
  useContext,
  useCallback,
} from 'react';
import moment from 'moment';
import { StoreContext } from '../../../../store/root.store';
import { setManageCalendarsData, setItemCalendar } from '../../actions';
import { setManageCalendarsDataAvaliability } from '../../submodules/Availability/actions';
import {
  STEP,
  HOUR_DURATION,
  MIN_RESIZE,
} from '../../constants/ManageCalendarsConstants';

import { ManageCalendarsView } from './ManageCalendarsView';
import { ManageCalendarsProps } from '../../Scheduler.types';

export const ManageCalendars: React.FC<ManageCalendarsProps> = ({
  start,
  end,
  appointment,
  locationCode,
  resourceLinks,
  patientNumber,
  audiologistLinks,
  resourcesModal,
  specialists,
  locations,
  isFindAvailability,
  toggleManageCalendarsModal,
  selectedTab,
  isRecurrence,
}): JSX.Element => {
  const [hourDuration, setHourDuration] = useState(HOUR_DURATION);
  const [locationWorkingHours, setLocationWorkingHours] = useState(null);

  const {
    state: {
      scheduler: {
        appointments: { appointmentWorkingHours },
        availability: { schedulerTabsAvaliability },
      },
    },
    dispatch,
  } = useContext(StoreContext);

  const selectedTabAvaliability = schedulerTabsAvaliability.find(
    (t) => t.tabID === selectedTab.tabID,
  );

  const manageCalendarsData = selectedTab?.manageCalendars?.manageCalendarsData;

  const manageCalendarsDataAvaliability =
    selectedTabAvaliability?.manageCalendarsAvaliability
      ?.manageCalendarsDataAvaliability;

  const audioLogistItems = useMemo(
    () =>
      audiologistLinks &&
      audiologistLinks.length > 0 &&
      audiologistLinks.map((item) => {
        const audioLogistLink =
          specialists &&
          specialists.find((a) => item.audiologistName === a.name);
        return {
          ...item,
          color: audioLogistLink && audioLogistLink.color,
          name: item.audiologistName,
          id: item.audiologistName,
        };
      }),
    [specialists, audiologistLinks],
  );

  const resourcesItems = useMemo(
    () =>
      resourceLinks &&
      resourceLinks.length > 0 &&
      resourceLinks.map((item) => {
        const resourceLink =
          resourcesModal &&
          resourcesModal.find((a) =>
            item.resourceCode
              ? a.resource === item.resourceCode
              : a.resource === item.resource,
          );
        return {
          ...item,
          color: resourceLink && resourceLink.color,
        };
      }),
    [resourcesModal, resourceLinks],
  );

  useEffect(() => {
    const manageCalendarForCheckData = manageCalendarsDataAvaliability.flat();
    const data = isFindAvailability
      ? selectedTabAvaliability.availabilityWorkingHours
      : appointmentWorkingHours;
    const workingHoursTime = isFindAvailability
      ? data?.find(
          (hours: any) =>
            hours.locationCode === locationCode &&
            moment(hours.start).isSame(
              moment(manageCalendarForCheckData?.[0]?.start).startOf('day'),
              'day',
            ),
        )
      : data?.find((hours: any) => hours.locationCode === locationCode);

    setLocationWorkingHours(workingHoursTime);
  }, [
    isFindAvailability,
    appointmentWorkingHours,
    selectedTabAvaliability.availabilityWorkingHours,
    manageCalendarsData,
  ]);

  useEffect(() => {
    // CREATE AND UPDATE DATA STRUCTURE FOR MANAGE CALENDARS
    const calendarItems = [];
    const oldManageCalendar = isFindAvailability
      ? [].concat(...manageCalendarsDataAvaliability)
      : [].concat(...manageCalendarsData);
    if (patientNumber) {
      const resultPatientItems = (): object => {
        const id = `patient`;
        const resultFind = oldManageCalendar.find((item) => item.id === id);

        if (resultFind) {
          return {
            ...resultFind,
            name: patientNumber && patientNumber.name,
            start: resultFind.start,
            end: resultFind.end,
          };
        }
        return {
          id,
          color:
            typeof locationCode === 'string'
              ? locations.filter(
                  (item) => item.locationCode === locationCode,
                )[0].color
              : locationCode && locationCode.color,
          patientNumber:
            (patientNumber && patientNumber.patientNumber) ||
            (appointment &&
              appointment.patientLinks.length > 0 &&
              appointment.patientLinks[0].patientNumber),
          name: patientNumber && patientNumber.name,
          start:
            appointment &&
            appointment.patientLinks &&
            appointment.patientLinks.length &&
            appointment.patientLinks[0].start
              ? appointment.patientLinks[0].start
              : start,
          end:
            appointment &&
            appointment.patientLinks &&
            appointment.patientLinks.length &&
            appointment.patientLinks[0].end
              ? appointment.patientLinks[0].end
              : end,
        };
      };

      calendarItems.push([resultPatientItems()]);
    }

    if (audiologistLinks && audiologistLinks.length > 0) {
      const resultAudioLogistFindMultiple = oldManageCalendar.filter((item) =>
        audioLogistItems.some((a) => item.name === a.name),
      );

      const resultAudioLogistItems = audioLogistItems.map((man) => {
        const id = `audiologistLinks-${man.name}-${man.id}`;
        const resultFind = oldManageCalendar.find((item) => item.id === id);

        if (resultFind) {
          return;
        }

        return {
          id,
          color: man.color,
          name: man.name,
          start: man.start ? man.start : start,
          end: man.end ? man.end : end,
        };
      });

      const updateAudiologistData = [
        ...resultAudioLogistFindMultiple,
        ...resultAudioLogistItems,
      ].filter(Boolean);

      const resultAudioLogistItemsInOneArray = updateAudiologistData.reduce(
        (acc, item) => {
          if (Array.isArray(acc[item.name])) {
            acc[item.name].push(item);
          } else {
            acc[item.name] = [item];
          }
          return acc;
        },
        {},
      );

      calendarItems.push(...Object.values(resultAudioLogistItemsInOneArray));
    }

    if (resourceLinks && resourceLinks.length > 0) {
      const resultResrourceFindMultiple = oldManageCalendar.filter((item) =>
        resourcesItems.some((a) => item.name === a.resourceCode),
      );

      const resultResourceItems = resourcesItems.map((res) => {
        const id = `resourceLinks-${res.resourceCode}`;
        const resultFind = oldManageCalendar.find((item) => item.id === id);

        if (resultFind) {
          return;
        }
        return {
          id,
          color: res.color,
          name: res.resourceCode,
          start: res.start ? res.start : start,
          end: res.end ? res.end : end,
        };
      });

      const updateResorceData = [
        ...resultResrourceFindMultiple,
        ...resultResourceItems,
      ].filter(Boolean);

      const resultResourceItemsInOneArray = updateResorceData.reduce(
        (acc, item) => {
          if (Array.isArray(acc[item.name])) {
            acc[item.name].push(item);
          } else {
            acc[item.name] = [item];
          }
          return acc;
        },
        {},
      );

      calendarItems.push(...Object.values(resultResourceItemsInOneArray));
    }

    if (isFindAvailability) {
      dispatch(
        setManageCalendarsDataAvaliability(selectedTab.tabID, calendarItems),
      );
    } else {
      !isRecurrence &&
        dispatch(setManageCalendarsData(selectedTab.tabID, calendarItems));
    }
    return () => {
      if (
        (!isFindAvailability && moment(end).isBefore(start)) ||
        !!moment(end).isSame(start)
      ) {
        !isRecurrence &&
          dispatch(setManageCalendarsData(selectedTab.tabID, []));
      }
    };
  }, [
    start,
    end,
    patientNumber,
    locationCode,
    resourceLinks,
    audiologistLinks,
  ]);

  const itemCalendarHandle = useCallback((data) => {
    dispatch(setItemCalendar(selectedTab.tabID, data));
  }, []);

  const plusResize = (): void => {
    setHourDuration(hourDuration + STEP);
  };

  const minusResize = (): void => {
    if (hourDuration !== STEP * MIN_RESIZE) {
      setHourDuration(hourDuration - STEP);
    }
  };

  return (
    <div className="manage-calendars-wrap">
      <ManageCalendarsView
        hourDuration={hourDuration}
        step={STEP}
        start={start}
        end={end}
        manageCalendarsData={
          isFindAvailability
            ? manageCalendarsDataAvaliability
            : manageCalendarsData
        }
        toggle={toggleManageCalendarsModal}
        itemCalendarHandle={itemCalendarHandle}
        plusResize={plusResize}
        minusResize={minusResize}
        isFindAvailability={isFindAvailability}
        locationWorkingHours={locationWorkingHours as any}
      />
    </div>
  );
};
