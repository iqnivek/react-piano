import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import difference from 'lodash.difference';
import Keyboard from './Keyboard';

class Piano extends React.Component {
  static propTypes = {
    noteRange: PropTypes.object.isRequired,
    onPlayNote: PropTypes.func.isRequired,
    onStopNote: PropTypes.func.isRequired,
    renderNoteLabel: PropTypes.func.isRequired,
    className: PropTypes.string,
    disabled: PropTypes.bool,
    width: PropTypes.number,
    keyWidthToHeight: PropTypes.number,
    keyboardShortcuts: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        midiNumber: PropTypes.number.isRequired,
      }),
    ),
    playbackNotes: PropTypes.arrayOf(PropTypes.number.isRequired),
  };

  static defaultProps = {
    renderNoteLabel: ({ keyboardShortcut, midiNumber, isActive, isAccidental }) =>
      keyboardShortcut ? (
        <div
          className={classNames('ReactPiano__NoteLabel', {
            'ReactPiano__NoteLabel--active': isActive,
            'ReactPiano__NoteLabel--accidental': isAccidental,
            'ReactPiano__NoteLabel--natural': !isAccidental,
          })}
        >
          {keyboardShortcut}
        </div>
      ) : null,
  };

  constructor(props) {
    super(props);

    this.state = {
      activeNotes: [],
      isMouseDown: false,
      useTouchEvents: false,
    };

    this.keyboardRef = React.createRef();
  }

  componentDidMount() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.keyboardRef.current.addEventListener('mousedown', this.onMouseDown);
    this.keyboardRef.current.addEventListener('mouseup', this.onMouseUp);
    this.keyboardRef.current.addEventListener('touchstart', this.onTouchStart);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.keyboardRef.current.removeEventListener('mousedown', this.onMouseDown);
    this.keyboardRef.current.removeEventListener('mouseup', this.onMouseUp);
    this.keyboardRef.current.removeEventListener('touchstart', this.onTouchStart);
  }

  componentDidUpdate(prevProps, prevState) {
    // If keyboard shortcuts change, any activeNotes will not
    // correctly fire keyUp events. First cancel all activeNotes.
    if (prevProps.keyboardShortcuts !== this.props.keyboardShortcuts) {
      this.setState({
        activeNotes: [],
      });
    }

    if (this.state.activeNotes !== prevState.activeNotes) {
      this.handleNoteChanges({
        prevActiveNotes: prevState.activeNotes || [],
        nextActiveNotes: this.state.activeNotes || [],
      });
    }
  }

  handleNoteChanges = ({ prevActiveNotes, nextActiveNotes }) => {
    const notesStarted = difference(prevActiveNotes, nextActiveNotes);
    const notesStopped = difference(nextActiveNotes, prevActiveNotes);
    notesStarted.forEach((midiNumber) => {
      this.onStopNote(midiNumber);
    });
    notesStopped.forEach((midiNumber) => {
      this.onPlayNote(midiNumber);
    });
  };

  getMidiNumberForKey = (key) => {
    if (!this.props.keyboardShortcuts) {
      return null;
    }
    const shortcut = this.props.keyboardShortcuts.find((sh) => sh.key === key);
    return shortcut && shortcut.midiNumber;
  };

  getKeyForMidiNumber = (midiNumber) => {
    if (!this.props.keyboardShortcuts) {
      return null;
    }
    const shortcut = this.props.keyboardShortcuts.find((sh) => sh.midiNumber === midiNumber);
    return shortcut && shortcut.key;
  };

  onKeyDown = (event) => {
    // Don't conflict with existing combinations like ctrl + t
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const midiNumber = this.getMidiNumberForKey(event.key);
    if (midiNumber) {
      this.onPlayNote(midiNumber);
    }
  };

  onKeyUp = (event) => {
    // This *should* also check for event.ctrlKey || event.metaKey || event.ShiftKey like onKeyDown does,
    // but at least on Mac Chrome, when mashing down many alphanumeric keystrokes at once,
    // ctrlKey is fired unexpectedly, which would cause onStopNote to NOT be fired, which causes problematic
    // lingering notes. Since it's fairly safe to call onStopNote even when not necessary,
    // the ctrl/meta/shift check is removed to fix that issue.
    const midiNumber = this.getMidiNumberForKey(event.key);
    if (midiNumber) {
      this.onStopNote(midiNumber);
    }
  };

  onPlayNote = (midiNumber) => {
    if (this.props.disabled) {
      return;
    }
    // Prevent duplicate note firings
    const isActive = this.state.activeNotes.includes(midiNumber);
    if (isActive) {
      return;
    }
    // Pass in previous activeNotes for recording functionality
    this.props.onPlayNote(midiNumber, this.state.activeNotes);
    this.setState((prevState) => ({
      activeNotes: prevState.activeNotes.concat(midiNumber).sort(),
    }));
  };

  onStopNote = (midiNumber) => {
    if (this.props.disabled) {
      return;
    }
    const isInactive = !this.state.activeNotes.includes(midiNumber);
    if (isInactive) {
      return;
    }
    // Pass in previous activeNotes for recording functionality
    this.props.onStopNote(midiNumber, this.state.activeNotes);
    this.setState((prevState) => ({
      activeNotes: prevState.activeNotes.filter((note) => midiNumber !== note),
    }));
  };

  onMouseDown = () => {
    this.setState({
      isMouseDown: true,
    });
  };

  onMouseUp = () => {
    this.setState({
      isMouseDown: false,
    });
  };

  onTouchStart = () => {
    this.setState({
      useTouchEvents: true,
    });
  };

  renderNoteLabel = ({ midiNumber, isActive, isAccidental }) => {
    const keyboardShortcut = this.getKeyForMidiNumber(midiNumber);
    return this.props.renderNoteLabel({ keyboardShortcut, midiNumber, isActive, isAccidental });
  };

  render() {
    return (
      <Keyboard
        innerRef={this.keyboardRef}
        noteRange={this.props.noteRange}
        onPlayNote={this.onPlayNote}
        onStopNote={this.onStopNote}
        activeNotes={this.props.playbackNotes || this.state.activeNotes}
        className={this.props.className}
        disabled={this.props.disabled}
        width={this.props.width}
        keyWidthToHeight={this.props.keyWidthToHeight}
        gliss={this.state.isMouseDown}
        useTouchEvents={this.state.useTouchEvents}
        renderNoteLabel={this.renderNoteLabel}
      />
    );
  }
}

export default Piano;
