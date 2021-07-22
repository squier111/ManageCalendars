import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react';
import moment from 'moment';
import {
  Select,
  Button,
  Icon,
  icons,
  Modal,
  TextInput,
} from '@ad-ui/components';
import InputAdornment from '@material-ui/core/InputAdornment';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useLocalization } from '../../../../hooks/useLocalization';
import { StoreContext } from '../../../../store/root.store';
import { ManageCalendarsView } from './ManageCalendarsView';
import { ManageCalendarsProps } from '../../Scheduler.types';
import {
  setManageCalendarsData,
  setManageModalData,
  setItemCalendar,
} from '../../actions';
import { setManageCalendarsDataAvaliability } from '../../submodules/Availability/actions';
import { clearButton } from '../../../../constants/clearButton';
import { MOMENT_UNITS } from '../../../../constants/moment.constants';
import { getDateTimeSelectOptions } from '../../../../utils/DateTimeFormatters';
import {
  getLastArrayItem,
  createLastHourOption,
  filterIsInWorkingHoursRange,
  getDateTimeOptionsAfterStart,
} from '../../../../utils';
import { useStartEndTimeOptions } from '../../../../hooks/useStartEndTimeOptions';
import { useManageCalendarsStartEndTimeOptions } from '../../../../hooks/useManageCalendarsStartEndTimeOptions';

export const ManageCalendarsModal: React.FC<ManageCalendarsProps> = ({
  hourDuration,
  step,
  start,
  end,
  toggle,
  open,
  itemCalendar,
  minResize,
  isFindAvailability,
  calendarAppointmentData,
  locationCode,
  selectedTab,
}): JSX.Element => {
  const {
    state: {
      auth: {
        userSettings: { Use24HourTimeFormat },
      },
      layout: { translations },
      scheduler: {
        appointments: { appointmentWorkingHours },
        availability: { schedulerTabsAvaliability },
      },
    },
    dispatch,
  } = useContext(StoreContext);

  const use24HourTimeFormat = Use24HourTimeFormat === 'true';

  const [hourDurationData, setHourDuration] = useState(hourDuration);
  const [itemCalendarData, setItemCalendarData] = useState(itemCalendar);

  const selectedTabAvaliability = schedulerTabsAvaliability.find(
    (t) => t.tabID === selectedTab.tabID,
  );

  const manageCalendarsDataAvaliability =
    selectedTabAvaliability?.manageCalendarsAvaliability
      ?.manageCalendarsDataAvaliability;

  const { control, watch, register, setValue, getValues, reset } = useForm({
    defaultValues: {
      manage:
        itemCalendarData.length > 0 &&
        itemCalendarData.map((item) => ({
          startManage: isFindAvailability
            ? String(
                moment(item.start).diff(moment(start), MOMENT_UNITS.minutes),
              )
            : item.start
            ? moment(item.start).utc().format()
            : undefined,
          endManage: isFindAvailability
            ? String(
                moment(item.end).diff(moment(item.start), MOMENT_UNITS.minutes),
              )
            : item.end
            ? moment(item.end).utc().format()
            : undefined,
        })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'manage',
  });

  const localize = useLocalization(translations);
  const { manage } = watch(['manage']);
  const manageFromRef = useRef(manage);
  const itemCalendarDataRef = useRef(itemCalendarData);
  const calendarDateTimeStart =
    itemCalendarData &&
    itemCalendarData.length > 0 &&
    itemCalendarData[0].start;

  const closeModal = (): void => {
    toggle(false);
  };

  const format = use24HourTimeFormat ? 'H:mm' : 'h:mm A';

  const manageCalendarForCheckData = manageCalendarsDataAvaliability.flat();

  const dataAppointmentWorkingHours = isFindAvailability
    ? selectedTabAvaliability.availabilityWorkingHours
    : appointmentWorkingHours;

  const locationWorkingHours = isFindAvailability
    ? dataAppointmentWorkingHours.find(
        (workingHour) =>
          workingHour.locationCode === locationCode &&
          moment(workingHour.start).isSame(
            moment(manageCalendarForCheckData?.[0]?.start).startOf('day'),
            'day',
          ),
      )
    : dataAppointmentWorkingHours.find(
        (workingHour) => workingHour.locationCode === locationCode,
      );

  const [dateTimeStartOptions, dateTimeEndOptions] =
    useManageCalendarsStartEndTimeOptions(
      manage,
      locationWorkingHours,
      calendarDateTimeStart,
      format,
    );

  const onSaveModal = (): void => {
    closeModal();
    if (isFindAvailability) {
      dispatch(
        setManageCalendarsDataAvaliability(
          selectedTab.tabID,
          selectedTab?.manageCalendars?.manageModalData,
        ),
      );
    } else {
      dispatch(
        setManageCalendarsData(
          selectedTab.tabID,
          selectedTab?.manageCalendars?.manageModalData,
        ),
      );
    }
  };

  const onCloseModal = (): void => {
    closeModal();
  };

  const dynamicUpdateDatasManageCalendars = (): void => {
    const oldManageModalData = selectedTab?.manageCalendars?.manageModalData;

    const manageDataVariantUnique = oldManageModalData.map((calItems) =>
      calItems.reduce((acc, item) => {
        const findRes = acc.find((fi) => fi.name === itemCalendarData[0].name);
        if (!findRes) {
          acc.push(item);
        }
        return acc;
      }, []),
    );

    const modifyData = manage.map((item) => ({
      ...itemCalendarData[0],
      start: isFindAvailability
        ? moment(start)
            .utc()
            .add(item.startManage, MOMENT_UNITS.minutes)
            .format()
        : item.startManage,
      end: isFindAvailability
        ? moment(
            moment(start).utc().add(item.startManage, MOMENT_UNITS.minutes),
          )
            .utc()
            .add(Number(item.endManage), MOMENT_UNITS.minutes)
            .format()
        : item.endManage,
    }));

    const calendarItemsMod = manageDataVariantUnique.map((calItems) =>
      calItems.map((cal) => {
        const result =
          modifyData && modifyData.find((item) => item.name === cal.name);

        if (result) {
          return modifyData.map((calItem) => ({
            ...cal,
            start: calItem.start,
            end: calItem.end,
          }));
        }
        return cal;
      }),
    );

    const calendarItemsEdit = calendarItemsMod.map((item) => item.flat());

    if (calendarItemsEdit && calendarItemsEdit.length > 0) {
      dispatch(setItemCalendar(selectedTab.tabID, modifyData));
      dispatch(setManageModalData(selectedTab.tabID, calendarItemsEdit));
    }
  };

  useEffect(() => {
    // DYNAMIC UPDATE DATAS FOR MANAGE CALENDARS
    let changed = false;
    if (manageFromRef.current.length !== manage.length) {
      changed = true;
    }
    for (let i = 0; i < manageFromRef.current.length; i++) {
      if (
        manageFromRef.current[i]?.startManage !== manage[i]?.startManage ||
        manageFromRef.current[i]?.endManage !== manage[i]?.endManage
      ) {
        changed = true;
        break;
      }
    }
    if (!changed) return;

    dynamicUpdateDatasManageCalendars();

    manageFromRef.current = manage;
    itemCalendarDataRef.current = itemCalendarData;
  }, [manage]);

  useEffect(() => {
    if (
      (!isFindAvailability &&
        moment(manage[0].endManage).isBefore(manage[0].startManage)) ||
      !!moment(manage[0].endManage).isSame(manage[0].startManage)
    ) {
      setValue('manage', [{ endManage: '' }]);
    }
  }, [manage]);

  const lastManageEndDateTimeOptions =
    dateTimeEndOptions.length && getLastArrayItem(dateTimeEndOptions);

  const plusResize = (): void => {
    setHourDuration(hourDurationData + step);
  };

  const minusResize = (): void => {
    if (hourDurationData !== step * minResize) {
      setHourDuration(hourDurationData - step);
    }
  };

  const itemCalendarHandle = useCallback(
    (data) => {
      if (data.find((item) => item.id !== itemCalendarData[0].id)) {
        reset({
          manage:
            data.length > 0 &&
            data.map((item) => ({
              startManage: isFindAvailability
                ? String(
                    moment(item.start).diff(
                      moment(start),
                      MOMENT_UNITS.minutes,
                    ),
                  )
                : item.start
                ? moment(item.start).utc().format()
                : undefined,
              endManage: isFindAvailability
                ? String(
                    moment(item.end).diff(
                      moment(item.start),
                      MOMENT_UNITS.minutes,
                    ),
                  )
                : item.end
                ? moment(item.end).utc().format()
                : undefined,
            })),
        });
        setItemCalendarData(data);
      }
    },
    [itemCalendarData],
  );

  useEffect(() => {
    dynamicUpdateDatasManageCalendars();
  }, [itemCalendarData]);

  const modalConfig = {
    edit: {
      props: {
        header: localize('scheduler.managecalendars.modal.title'),
        withBorderBottomControls: true,
        bottomControls: (
          <>
            <Button color="secondary" onClick={() => onCloseModal()}>
              {localize('layout.modal.button.cancel')}
            </Button>
            <Button
              onClick={() => onSaveModal()}
              variant="contained"
              color="secondary"
              key="save"
            >
              {localize('layout.modal.button.save')}
            </Button>
          </>
        ),
      },
      content: (
        <div className="content-modal-manage-calendars">
          <ManageCalendarsView
            locationCode={locationCode}
            isFindAvailability={isFindAvailability}
            itemCalendar={itemCalendarData}
            hourDuration={hourDurationData}
            step={step}
            start={start}
            end={end}
            itemCalendarHandle={itemCalendarHandle}
            plusResize={plusResize}
            minusResize={minusResize}
            locationWorkingHours={locationWorkingHours}
            manageCalendarsData={selectedTab?.manageCalendars?.manageModalData}
            isInModal
          />
          <div className="controls-wrapper">
            {fields.map((item, index) => (
              <div className="controls-items" key={item.id}>
                <div className="counter">{index + 1}</div>
                <div className="select-left">
                  {isFindAvailability ? (
                    <TextInput
                      disabled={manage[index] !== manage[manage.length - 1]}
                      label={localize(
                        'scheduler.managecalendars.modal.input.starttime',
                      )}
                      id="StartAfter"
                      type="number"
                      name={`manage[${index}].startManage`}
                      defaultValue={
                        item.startManage ||
                        (manage.length > 0 &&
                          manage[index - 1] &&
                          Number(manage[index - 1].startManage) +
                            Number(manage[index - 1].endManage) +
                            5)
                      }
                      onBlur={() => {
                        const validStartAfter =
                          manage.length > 0 &&
                          manage[index - 1] &&
                          Number(manage[index - 1].startManage) +
                            Number(manage[index - 1].endManage) +
                            5;

                        const currValue = getValues(
                          `manage[${index}].startManage`,
                        );
                        if (currValue <= validStartAfter) {
                          setValue(
                            `manage[${index}].startManage`,
                            validStartAfter,
                          );
                        }
                        if (index === 0 && currValue === '') {
                          setValue(`manage[${index}].startManage`, 0);
                        }
                      }}
                      onKeyDown={(evt) =>
                        ['e', 'E', '+', '-'].includes(evt.key) &&
                        evt.preventDefault()
                      }
                      changeValue={(value) => {
                        const max =
                          manage.length > 0 &&
                          manage[index] &&
                          moment(end).diff(
                            moment(start),
                            MOMENT_UNITS.minutes,
                          ) - Number(manage[index].endManage);

                        const min =
                          manage.length > 0 &&
                          manage[index - 1] &&
                          Number(manage[index - 1].startManage) +
                            Number(manage[index - 1].endManage) +
                            5;

                        if (Number(value) <= max && Number(value) >= min) {
                          setValue(`manage[${index}].startManage`, value);
                        } else if (Number(value) >= max) {
                          setValue(`manage[${index}].startManage`, max);
                        }
                      }}
                      inputRef={register()}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {localize(
                              'scheduler.managecalendars.modal.input.duration.minutes',
                            )}
                          </InputAdornment>
                        ),
                        inputProps: {
                          max:
                            manage[index] &&
                            manage.length > 0 &&
                            moment(end).diff(
                              moment(start),
                              MOMENT_UNITS.minutes,
                            ) - Number(manage[index].endManage),
                          min:
                            (manage[index] &&
                              manage.length > 0 &&
                              manage[index - 1] &&
                              Number(manage[index - 1].startManage) +
                                Number(manage[index - 1].endManage) +
                                5) ||
                            0,
                        },
                      }}
                    />
                  ) : (
                    <Controller
                      name={`manage[${index}].startManage`}
                      as={Select}
                      isEditable={{
                        mask: {
                          maskType: 'time',
                          format: use24HourTimeFormat ? '24h' : '12h',
                        },
                      }}
                      onChange={([value]) => {
                        const val =
                          value &&
                          moment(calendarAppointmentData)
                            .utc()
                            .startOf(MOMENT_UNITS.day)
                            .set({
                              hour: moment(value.id).utc().format('H'),
                              minute: moment(value.id).utc().format('mm'),
                              second: 0,
                            })
                            .format();

                        if (
                          (index > 0 &&
                            moment(val)
                              .subtract(4, 'minutes')
                              .isSameOrBefore(manage[index - 1].endManage)) ||
                          (manage[index].endManage &&
                            moment(val).isSameOrAfter(manage[index].endManage))
                        ) {
                          return '';
                        }

                        return val;
                      }}
                      control={control}
                      options={dateTimeStartOptions[index]}
                      defaultValue={item.value}
                      clearButton={clearButton.none}
                      rules={{ required: false }}
                      placeholderSearch={localize('scheduler.modal.starttime')}
                      inputProps={{
                        required: false,
                        withIcon: <Icon iconName={icons.clock} />,
                        label: localize('scheduler.modal.starttime'),
                        disabled: manage[index] !== manage[manage.length - 1],
                      }}
                    />
                  )}
                </div>
                <div className="select-right">
                  {isFindAvailability ? (
                    <TextInput
                      disabled={manage[index] !== manage[manage.length - 1]}
                      label={localize(
                        'scheduler.managecalendars.modal.input.duration',
                      )}
                      id="Duration"
                      type="number"
                      name={`manage[${index}].endManage`}
                      defaultValue={item.endManage || 5}
                      onKeyDown={(evt) =>
                        ['e', 'E', '+', '-'].includes(evt.key) &&
                        evt.preventDefault()
                      }
                      onBlur={() => {
                        const currValue = getValues(
                          `manage[${index}].endManage`,
                        );
                        if (currValue < 5) {
                          setValue(`manage[${index}].endManage`, 5);
                        }
                      }}
                      changeValue={(value) => {
                        const max =
                          manage.length > 0 &&
                          manage[index] &&
                          moment(end).diff(
                            moment(start),
                            MOMENT_UNITS.minutes,
                          ) - Number(manage[index].startManage);

                        if (Number(value) >= max) {
                          setValue(`manage[${index}].endManage`, max);
                        } else {
                          setValue(`manage[${index}].endManage`, Number(value));
                        }
                      }}
                      inputRef={register()}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {localize(
                              'scheduler.managecalendars.modal.input.duration.minutes',
                            )}
                          </InputAdornment>
                        ),
                        inputProps: {
                          max:
                            manage.length > 0 &&
                            manage[index] &&
                            moment(end).diff(
                              moment(start),
                              MOMENT_UNITS.minutes,
                            ) - Number(manage[index].startManage),
                          min: 5,
                        },
                      }}
                    />
                  ) : (
                    <Controller
                      name={`manage[${index}].endManage`}
                      as={Select}
                      isEditable={{
                        mask: {
                          maskType: 'time',
                          format: use24HourTimeFormat ? '24h' : '12h',
                        },
                      }}
                      control={control}
                      options={dateTimeEndOptions[index]}
                      clearButton={clearButton.none}
                      onChange={([value]) => {
                        const val =
                          value &&
                          moment(calendarAppointmentData)
                            .utc()
                            .startOf(MOMENT_UNITS.day)
                            .set({
                              hour: moment(value.id).utc().format('H'),
                              minute: moment(value.id).utc().format('mm'),
                              second: 0,
                            })
                            .format();

                        if (
                          moment(val)
                            .subtract(4, 'minutes')
                            .isSameOrBefore(manage[index].startManage)
                        ) {
                          return '';
                        }

                        return val;
                      }}
                      rules={{ required: false }}
                      defaultValue={item.value}
                      placeholderSearch={localize('scheduler.modal.endtime')}
                      inputProps={{
                        required: false,
                        withIcon: <Icon iconName={icons.clock} />,
                        label: localize('scheduler.modal.endtime'),
                        disabled: manage[index] !== manage[manage.length - 1],
                      }}
                    />
                  )}
                </div>
                <Button
                  disabled={
                    index === 0 || manage[index] !== manage[manage.length - 1]
                  }
                  className="delete"
                  variant="contained"
                  withIcon
                  onClick={() => remove(index)}
                >
                  <Icon iconName={icons.trash} />
                </Button>
              </div>
            ))}
          </div>
          <div className="add-instance">
            <Button
              disabled={
                !isFindAvailability
                  ? itemCalendarData[0].id === 'patient' ||
                    manage.some(
                      (item) =>
                        item.startManage === undefined ||
                        item.endManage === undefined,
                    ) ||
                    getLastArrayItem(manage).endManage >=
                      getLastArrayItem(lastManageEndDateTimeOptions)?.id
                  : Number(getLastArrayItem(manage).startManage) +
                      Number(getLastArrayItem(manage).endManage) >=
                    moment(end).diff(moment(start), MOMENT_UNITS.minutes) - 10
              }
              size="medium"
              color="secondary"
              startIcon={<Icon iconName={icons.add} />}
              onClick={() => append({})}
            >
              {localize('scheduler.managecalendars.modal.addinstance')}
            </Button>
          </div>
        </div>
      ),
    },
  };

  return (
    <Modal
      open={open}
      toggle={() => toggle(false)}
      renderContainerIdentifier="#scheduler"
      {...modalConfig.edit.props}
    >
      {modalConfig.edit.content}
    </Modal>
  );
};
