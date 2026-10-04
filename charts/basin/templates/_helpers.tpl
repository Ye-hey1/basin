{{/*
Expand the name of the chart.
*/}}
{{- define "basin.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "basin.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "basin.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "basin.labels" -}}
helm.sh/chart: {{ include "basin.chart" . }}
{{ include "basin.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "basin.selectorLabels" -}}
app.kubernetes.io/name: {{ include "basin.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "basin.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "basin.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
URL-encode credentials for URI userinfo. Sprig urlquery uses form escaping,
so spaces become +; in userinfo they must be %20 to preserve credentials.
*/}}
{{- define "basin.urlencodeUserinfo" -}}
{{- . | urlquery | replace "+" "%20" -}}
{{- end }}

{{/*
API component common labels
*/}}
{{- define "basin.api.labels" -}}
helm.sh/chart: {{ include "basin.chart" . }}
{{ include "basin.api.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/component: api
{{- end }}

{{/*
API component selector labels
*/}}
{{- define "basin.api.selectorLabels" -}}
app.kubernetes.io/name: {{ include "basin.name" . }}-api
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Web component common labels
*/}}
{{- define "basin.web.labels" -}}
helm.sh/chart: {{ include "basin.chart" . }}
{{ include "basin.web.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/component: web
{{- end }}

{{/*
Web component selector labels
*/}}
{{- define "basin.web.selectorLabels" -}}
app.kubernetes.io/name: {{ include "basin.name" . }}-web
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
