import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {useCaption} from './useCaption';
import {useRoomInfo, useContent} from 'customization-api';
import CommonStyles from '../../components/CommonStyles';
import ThemeConfig from '../../theme';
import Spacer from '../../atoms/Spacer';
import PrimaryButton from '../../atoms/PrimaryButton';
import useSummaryDownload from './useSummaryDownload';
import {formatTranscriptContent} from './utils';
import {isMobileUA, isWebInternal, useIsSmall} from '../../utils/common';
import {getGridLayoutName} from '../../pages/video-call/DefaultLayouts';
import {useLayout} from '../../utils/useLayout';
import useCaptionWidth from './useCaptionWidth';
import SidePanelHeader from '../SidePanelHeader';

const SummarizerPanel = () => {
  const {
    meetingTranscript,
    isSummarizing,
    setIsSummarizing,
    meetingSummary,
    setMeetingSummary,
    isSummarizerOpen,
    setIsSummarizerOpen,
  } = useCaption();

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const {defaultContent} = useContent();
  const {
    data: {meetingTitle},
  } = useRoomInfo();

  const isSmall = useIsSmall();
  const {currentLayout} = useLayout();
  const {transcriptHeight} = useCaptionWidth();
  const {downloadSummary} = useSummaryDownload();

  const handleGenerateSummary = async () => {
    if (meetingTranscript.length === 0) {
      setErrorMessage('No transcript content available to summarize.');
      return;
    }

    setErrorMessage(null);
    setIsSummarizing(true);

    try {
      const [formattedTranscript] = formatTranscriptContent(
        meetingTranscript,
        meetingTitle,
        defaultContent,
      );

      const response = await fetch('http://localhost:8000/api/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: formattedTranscript,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.detail || `Server returned error status ${response.status}`);
      }

      const data = await response.json();
      if (data && data.summary) {
        setMeetingSummary(data.summary);
      } else {
        throw new Error('Could not parse summary from server response.');
      }
    } catch (err: any) {
      console.error('[SUMMARIZER] Error generating summary:', err);
      setErrorMessage(
        `Failed to generate summary. Make sure the backend server is running at http://localhost:8000. Details: ${err.message || err}`
      );
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDownload = async () => {
    try {
      await downloadSummary();
    } catch (err: any) {
      setErrorMessage(`Failed to download summary: ${err.message}`);
    }
  };

  return (
    <View
      style={[
        isMobileUA()
          ? CommonStyles.sidePanelContainerNative
          : isSmall()
          ? CommonStyles.sidePanelContainerWebMinimzed
          : {
              ...CommonStyles.sidePanelContainerWeb,
              // Since it's on the left, we switch margins!
              marginLeft: 0,
              marginRight: 8,
            },
        isWebInternal() && !isSmall() && currentLayout === getGridLayoutName()
          ? {marginVertical: 4}
          : {},
        transcriptHeight && !isMobileUA() && {height: transcriptHeight as any},
        {paddingBottom: 20},
      ]}
    >
      <SidePanelHeader
        leadingIconName="back-btn"
        leadingIconOnPress={() => setIsSummarizerOpen(false)}
        centerComponent={
          <Text style={styles.headerText}>AI Summarizer</Text>
        }
      />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>AI Meeting Note Summarizer</Text>
        <Text style={styles.description}>
          Analyze the meeting transcript and generate structured notes using Gemini-2.5-Flash.
        </Text>

        <Spacer size={15} />

        {meetingTranscript.length === 0 ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              No transcript available yet. Please enable STT and speak in the meeting to gather transcripts first.
            </Text>
          </View>
        ) : (
          <View style={styles.actionContainer}>
            <PrimaryButton
              text={isSummarizing ? 'Summarizing...' : '💡 Generate Summary'}
              disabled={isSummarizing}
              onPress={handleGenerateSummary}
              containerStyle={styles.btn}
            />
          </View>
        )}

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <Spacer size={20} />

        {meetingSummary ? (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Generated Summary</Text>
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={handleDownload}
              >
                <Text style={styles.downloadButtonText}>⬇️ Download Markdown</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>{meetingSummary}</Text>
            </View>
          </View>
        ) : meetingTranscript.length > 0 && !isSummarizing ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Click the button above to generate beautiful Markdown meeting notes and action items.
            </Text>
          </View>
        ) : isSummarizing ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Connecting to Gemini-2.5-Flash to generate summaries, key highlights, and action items...
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
  },
  headerText: {
    fontFamily: ThemeConfig.FontFamily.sansPro,
    fontSize: ThemeConfig.FontSize.normal,
    fontWeight: '600',
    color: $config.FONT_COLOR,
  },
  title: {
    fontSize: ThemeConfig.FontSize.medium,
    fontWeight: '700',
    color: $config.FONT_COLOR,
    marginBottom: 8,
  },
  description: {
    fontSize: ThemeConfig.FontSize.small,
    color: $config.FONT_COLOR,
    opacity: 0.7,
    lineHeight: 18,
  },
  infoBox: {
    padding: 15,
    backgroundColor: $config.CARD_LAYER_2_COLOR,
    borderRadius: ThemeConfig.BorderRadius.small,
    borderWidth: 1,
    borderColor: $config.CARD_LAYER_3_COLOR,
    marginTop: 10,
  },
  infoText: {
    fontSize: ThemeConfig.FontSize.small,
    color: $config.FONT_COLOR,
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  btn: {
    width: '100%',
    paddingVertical: 12,
  },
  errorBox: {
    padding: 12,
    backgroundColor: '#3b1a1a',
    borderColor: '#c0392b',
    borderWidth: 1,
    borderRadius: ThemeConfig.BorderRadius.small,
    marginTop: 15,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    lineHeight: 16,
  },
  summaryContainer: {
    marginTop: 10,
    flex: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: ThemeConfig.FontSize.normal,
    fontWeight: '600',
    color: $config.FONT_COLOR,
  },
  downloadButton: {
    backgroundColor: $config.PRIMARY_ACTION_BRAND_COLOR,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: ThemeConfig.BorderRadius.small,
  },
  downloadButtonText: {
    color: $config.FONT_COLOR,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryBox: {
    padding: 15,
    backgroundColor: $config.CARD_LAYER_2_COLOR,
    borderColor: $config.CARD_LAYER_3_COLOR,
    borderWidth: 1,
    borderRadius: ThemeConfig.BorderRadius.small,
  },
  summaryText: {
    fontSize: ThemeConfig.FontSize.small,
    color: $config.FONT_COLOR,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default SummarizerPanel;
